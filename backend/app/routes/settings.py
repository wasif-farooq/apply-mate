import logging

import requests
from authlib.integrations.requests_client import OAuth2Session
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from models import User
from repositories.user_repo import UserRepository
from core.config import get_settings as get_app_settings
from core.constants import GOOGLE_SCOPES

logger = logging.getLogger("job-applier")

router = APIRouter(prefix="/api/settings", tags=["settings"])

settings = get_app_settings()


@router.get("/email")
def get_email_config(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(current_user.id)

    if not user or not user.email_config:
        return {"type": None, "configured": False}

    email_config = user.email_config
    configured = True

    if email_config.get("type") == "google":
        return {
            "type": "google",
            "email": email_config.get("google", {}).get("email"),
            "configured": configured
        }
    elif email_config.get("type") == "smtp":
        smtp_config = email_config.get("smtp", {})
        return {
            "type": "smtp",
            "host": smtp_config.get("host"),
            "port": smtp_config.get("port"),
            "username": smtp_config.get("username"),
            "from_email": smtp_config.get("from_email"),
            "configured": configured
        }

    return {"type": None, "configured": False}


class EmailConfigUpdate(BaseModel):
    type: str
    google: dict = None
    smtp: dict = None


@router.put("/email")
def save_email_config(
    config: EmailConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_repo = UserRepository(db)
    user = user_repo.get_by_id(current_user.id)

    email_config = {"type": config.type}

    if config.type == "google" and config.google:
        email_config["google"] = config.google
    elif config.type == "smtp" and config.smtp:
        smtp = config.smtp
        email_config["smtp"] = {
            "host": smtp.get("host"),
            "port": smtp.get("port"),
            "username": smtp.get("username"),
            "password": smtp.get("password"),
            "from_email": smtp.get("from_email", smtp.get("username")),
            "use_tls": smtp.get("use_tls", True)
        }

    user_repo.update(user, email_config=email_config)
    logger.info(f"[Settings] Email config saved for user {current_user.id}")

    return {"status": "saved", "type": config.type}


@router.get("/email/connect-google")
def connect_google_email(current_user: User = Depends(get_current_user)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.error("[Settings] Google OAuth not configured")
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    client = OAuth2Session(
        settings.GOOGLE_CLIENT_ID,
        settings.GOOGLE_CLIENT_SECRET,
        scope=GOOGLE_SCOPES + ["https://www.googleapis.com/auth/gmail.send"]
    )

    redirect_uri = settings.GOOGLE_REDIRECT_URI
    uri, state = client.create_authorization_url(
        "https://accounts.google.com/o/oauth2/v2/auth",
        redirect_uri=redirect_uri,
        access_type="offline",
        prompt="consent"
    )

    logger.info(f"[Settings] Email Google OAuth URL generated, state: {state[:20]}...")

    return {"authorization_url": uri, "state": state}


class EmailCallbackRequest(BaseModel):
    code: str
    state: str


@router.post("/email/callback")
def email_oauth_callback(
    request: EmailCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client = OAuth2Session(
        settings.GOOGLE_CLIENT_ID,
        settings.GOOGLE_CLIENT_SECRET,
        state=request.state
    )

    redirect_uri = settings.GOOGLE_REDIRECT_URI
    token = client.fetch_token(
        "https://oauth2.googleapis.com/token",
        code=request.code,
        redirect_uri=redirect_uri,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        grant_type="authorization_code"
    )

    access_token = token.get("access_token")
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=headers)
    resp.raise_for_status()
    user_info = resp.json()

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(current_user.id)

    email_config = {
        "type": "google",
        "google": {
            "refresh_token": token.get("refresh_token"),
            "email": user_info.get("email")
        }
    }

    user_repo.update(user, email_config=email_config)
    logger.info(f"[Settings] Email Google OAuth completed for {user_info.get('email')}")

    return {"status": "connected", "email": user_info.get("email")}


class SmtpTestRequest(BaseModel):
    host: str
    port: int
    username: str
    password: str
    from_email: str = None
    use_tls: bool = True


@router.post("/email/smtp/test")
def test_smtp_connection(
    smtp_config: SmtpTestRequest,
    current_user: User = Depends(get_current_user)
):
    from services.smtp_service import SmtpEmailService

    config = {
        "host": smtp_config.host,
        "port": smtp_config.port,
        "username": smtp_config.username,
        "password": smtp_config.password,
        "from_email": smtp_config.from_email or smtp_config.username,
        "use_tls": smtp_config.use_tls
    }

    try:
        smtp_service = SmtpEmailService(config)
        result = smtp_service.validate()
        logger.info(f"[Settings] SMTP test successful for {smtp_config.username}")
        return {"status": "valid", "email": result.get("email")}
    except Exception as e:
        logger.error(f"[Settings] SMTP test failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))