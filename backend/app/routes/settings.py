import logging
import requests
from authlib.integrations.requests_client import OAuth2Session
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from models import User
from models.schemas import (
    ProviderConfigUpdate,
    ProviderModelsUpdate,
    ModelSelectionUpdate
)
from repositories.user_repo import UserRepository
from repositories.settings_repo import SettingsRepository
from repositories.provider_repo import ProviderRepository
from core.config import get_settings as get_app_settings
from core.constants import GOOGLE_SCOPES
from services.email_service import EmailService

logger = logging.getLogger("job-applier")

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _ensure_defaults_exist(user_id: int, db: Session):
    provider_repo = ProviderRepository(db)
    provider_repo.ensure_defaults_exist(user_id)


@router.get("")
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _ensure_defaults_exist(current_user.id, db)

    settings_repo = SettingsRepository(db)
    provider_repo = ProviderRepository(db)

    settings = settings_repo.get_by_user_id(current_user.id)
    if not settings:
        settings_data = {"selected_model": None, "selected_provider": None}
    else:
        settings_data = {
            "selected_model": settings.selected_model,
            "selected_provider": settings.selected_provider
        }

    provider_configs = provider_repo.get_all_configs(current_user.id)
    provider_models = provider_repo.get_all_models(current_user.id)

    return {
        "providers": [
            {
                "provider": c.provider,
                "enabled": c.enabled,
                "config": c.config
            }
            for c in provider_configs
        ],
        "models": provider_models,
        "selected_model": settings_data.get("selected_model"),
        "selected_provider": settings_data.get("selected_provider")
    }


@router.get("/providers")
def get_all_providers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    provider_repo = ProviderRepository(db)
    return provider_repo.get_all_configs(current_user.id)


@router.put("/providers/{provider}")
def update_provider(
    provider: str,
    config: ProviderConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    provider_repo = ProviderRepository(db)
    updated = provider_repo.update_config(
        current_user.id, provider,
        enabled=config.enabled,
        config=config.config
    )
    return {
        "provider": updated.provider,
        "enabled": updated.enabled,
        "config": updated.config
    }


@router.get("/models")
def get_all_models(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    provider_repo = ProviderRepository(db)
    return provider_repo.get_all_models(current_user.id)


@router.put("/models/{provider}")
def update_models(
    provider: str,
    data: ProviderModelsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    provider_repo = ProviderRepository(db)
    models = provider_repo.update_models(current_user.id, provider, data.models)
    return {"provider": provider, "models": [{"model_name": m.model_name} for m in models]}


@router.put("/selection")
def update_global_selection(
    data: ModelSelectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings_repo = SettingsRepository(db)
    settings_repo.set_selected_model(current_user.id, data.provider, data.model)
    return {"selected_model": data.model, "selected_provider": data.provider}


class OllamaCloudRequest(BaseModel):
    api_key: str


@router.post("/models/fetch-ollama-cloud")
def fetch_ollama_cloud_models(
    body: OllamaCloudRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    raise HTTPException(status_code=501, detail="Ollama Cloud is temporarily unavailable")


@router.get("/models/fetch-ollama")
def fetch_local_ollama_models(
    url: str = Query(default="http://localhost:11434"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        health_check = requests.get(f"{url}/api/tags", timeout=5)
        if health_check.status_code != 200:
            raise HTTPException(status_code=503, detail="Ollama is not responding")

        response = requests.get(f"{url}/api/tags", timeout=10)

        if response.status_code == 200:
            data = response.json()
            models = [m.get("name", "") for m in data.get("models", []) if m.get("name")]

            provider_repo = ProviderRepository(db)
            all_models = provider_repo.merge_models(current_user.id, "ollama", models)
            return {"models": all_models}
        else:
            raise HTTPException(status_code=response.status_code, detail="Failed to fetch models")
    except requests.RequestException as e:
        logger.error(f"[Settings] Local Ollama fetch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Ollama: {str(e)}")


class OpenRouterRequest(BaseModel):
    api_key: str


@router.post("/models/fetch-openrouter")
def fetch_openrouter_models(
    body: OpenRouterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        headers = {"Authorization": f"Bearer {body.api_key}"}
        response = requests.get(
            "https://openrouter.ai/api/v1/models",
            headers=headers,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            models = [m.get("id", "") for m in data.get("data", []) if m.get("id")]

            provider_repo = ProviderRepository(db)
            all_models = provider_repo.merge_models(current_user.id, "openrouter", models)
            return {"models": all_models}
        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API key")
        else:
            raise HTTPException(status_code=response.status_code, detail=f"Failed: {response.text}")
    except requests.RequestException as e:
        logger.error(f"[Settings] OpenRouter fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class OpenCodeRequest(BaseModel):
    provider: str
    api_key: str


@router.post("/models/fetch-opencode")
def fetch_opencode_models(
    body: OpenCodeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    provider_type = body.provider
    if provider_type not in ["zen", "go"]:
        raise HTTPException(status_code=400, detail="Provider must be 'zen' or 'go'")

    db_provider = f"opencode_{provider_type}"

    try:
        if provider_type == "zen":
            base_url = "https://opencode.ai/zen/v1"
        else:
            base_url = "https://opencode.ai/zen/go/v1"
        headers = {"Authorization": f"Bearer {body.api_key}"}
        response = requests.get(f"{base_url}/models", headers=headers, timeout=30)

        if response.status_code == 200:
            data = response.json()
            models = [m.get("id", "") for m in data.get("data", []) if m.get("id")]

            provider_repo = ProviderRepository(db)
            all_models = provider_repo.merge_models(current_user.id, db_provider, models)
            return {"models": all_models}
        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API key")
        else:
            raise HTTPException(status_code=response.status_code, detail=f"Failed: {response.text}")
    except requests.RequestException as e:
        logger.error(f"[Settings] OpenCode fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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