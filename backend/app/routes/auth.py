import logging
import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.exceptions import AuthenticationError
from core.config import get_settings
from core.security import create_access_token, decode_token
from models import User
from models.schemas import UserWithToken
from repositories.user_repo import UserRepository
from services.auth_service import AuthService

logger = logging.getLogger("job-applier")

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.get("/login")
def auth_login(db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.error("[Auth] Google OAuth not configured")
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo)

    try:
        auth_url, state = auth_service.get_google_auth_url()
        return {"authorization_url": auth_url, "state": state}
    except Exception as e:
        logger.error(f"[Auth] Login failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class AuthCallbackRequest(BaseModel):
    code: str
    state: str


@router.post("/callback")
def auth_callback(request: AuthCallbackRequest, db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo)

    try:
        user = auth_service.authenticate_google(request.code, request.state)
        token = create_access_token(user.id)

        logger.info(f"[Auth] User logged in: {user.email}")
        return UserWithToken(
            id=user.id,
            email=user.email,
            name=user.name,
            picture=user.picture,
            token=token
        )
    except Exception as e:
        logger.error(f"[Auth] Callback failed: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.post("/logout")
def auth_logout():
    return RedirectResponse(url="/", status_code=303)


@router.get("/me")
def auth_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture
    }


@router.post("/refresh")
def auth_refresh(request: Request, db: Session = Depends(get_db)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = auth_header.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.refresh_token:
        logger.warning(f"[Auth] No refresh token for user {user_id}")
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")

    client_id = settings.EXTENSION_GOOGLE_CLIENT_ID or settings.GOOGLE_CLIENT_ID
    client_secret = settings.EXTENSION_GOOGLE_CLIENT_SECRET or settings.GOOGLE_CLIENT_SECRET

    try:
        token_response = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": user.refresh_token,
                "grant_type": "refresh_token"
            }
        )
        token_response.raise_for_status()
        new_token_data = token_response.json()

        new_refresh_token = new_token_data.get("refresh_token")
        if new_refresh_token:
            user.refresh_token = new_refresh_token
            db.commit()

        new_access_token = create_access_token(user.id)
        logger.info(f"[Auth] Token refreshed for user {user.email}")
        return {"token": new_access_token}

    except requests.RequestException as e:
        logger.error(f"[Auth] Failed to refresh token: {e}")
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")