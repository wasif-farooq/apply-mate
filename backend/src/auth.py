import os
import secrets
import jwt
from datetime import datetime, timedelta
from typing import Optional
from authlib.integrations.requests_client import OAuth2Session
from sqlalchemy.orm import Session
from .db.models import User, UserSettings, ProviderConfig, ProviderModel
from .logger import logger

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

if not JWT_SECRET:
    JWT_SECRET = secrets.token_hex(32)
    logger.warning(f"JWT_SECRET not set, generated: {JWT_SECRET[:16]}...")

GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", f"{FRONTEND_URL}/auth/google/callback")
GOOGLE_SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.send"]


def generate_token(user_id: int) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_google_auth_url() -> tuple:
    logger.info(f"[AUTH] Generating auth URL...")
    logger.info(f"[AUTH] Client ID: {GOOGLE_CLIENT_ID[:20]}..." if GOOGLE_CLIENT_ID else "[AUTH] Client ID: NOT SET")
    logger.info(f"[AUTH] Redirect URI: {GOOGLE_REDIRECT_URI}")
    logger.info(f"[AUTH] Scopes: {GOOGLE_SCOPES}")
    
    client = OAuth2Session(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, scope=GOOGLE_SCOPES)
    uri, state = client.create_authorization_url(
        "https://accounts.google.com/o/oauth2/v2/auth",
        redirect_uri=GOOGLE_REDIRECT_URI,
        access_type="offline",
        prompt="consent"
    )
    
    logger.info(f"[AUTH] Auth URL generated, state: {state[:20]}...")
    return uri, state


def exchange_code_for_tokens(code: str, state: str) -> dict:
    logger.info(f"[AUTH] Exchanging code for tokens...")
    logger.info(f"[AUTH] Client ID: {GOOGLE_CLIENT_ID[:20]}..." if GOOGLE_CLIENT_ID else "[AUTH] Client ID: NOT SET")
    logger.info(f"[AUTH] Redirect URI: {GOOGLE_REDIRECT_URI}")
    logger.info(f"[AUTH] Code length: {len(code)}")
    logger.info(f"[AUTH] State length: {len(state)}")
    
    try:
        client = OAuth2Session(
            GOOGLE_CLIENT_ID, 
            GOOGLE_CLIENT_SECRET, 
            state=state
        )
        
        # Explicit token endpoint parameters
        token = client.fetch_token(
            "https://oauth2.googleapis.com/token",
            code=code,
            redirect_uri=GOOGLE_REDIRECT_URI,
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            grant_type="authorization_code"
        )
        logger.info(f"[AUTH] Token exchange successful")
        logger.info(f"[AUTH] Token keys: {list(token.keys())}")
        return token
    except Exception as e:
        logger.error(f"[AUTH] Token exchange FAILED: {e}")
        logger.error(f"[AUTH] Exception type: {type(e).__name__}")
        raise


def get_google_user_info(access_token: str) -> dict:
    import requests
    logger.info(f"[AUTH] Getting user info with access_token")
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=headers)
    logger.info(f"[AUTH] Userinfo response status: {resp.status_code}")
    resp.raise_for_status()
    return resp.json()


def create_or_update_user(db: Session, google_user: dict, refresh_token: str = None) -> User:
    user = db.query(User).filter(User.google_id == google_user["id"]).first()
    
    if not user:
        user = User(
            google_id=google_user["id"],
            email=google_user["email"],
            name=google_user.get("name"),
            picture=google_user.get("picture"),
            refresh_token=refresh_token
        )
        db.add(user)
        db.flush()
        
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        
        # Create default provider configs
        for provider in ["ollama", "ollama_cloud", "openrouter", "opencode_zen", "opencode_go", "openai", "anthropic", "google"]:
            config = ProviderConfig(
                user_id=user.id,
                provider=provider,
                enabled=provider == "ollama",
                config={"url": "http://localhost:11434", "api_key": ""} if provider == "ollama" else {"url": "https://cloud.ollama.com", "api_key": ""} if provider == "ollama_cloud" else {"url": "https://openrouter.ai/api/v1", "api_key": ""} if provider == "openrouter" else {"url": "https://opencode.ai/zen/v1", "api_key": ""} if provider == "opencode_zen" else {"url": "https://opencode.ai/zen/go/v1", "api_key": ""} if provider == "opencode_go" else {}
            )
            db.add(config)
        
        logger.info(f"[AUTH] Created new user: {user.email}")
    else:
        user.email = google_user["email"]
        user.name = google_user.get("name")
        user.picture = google_user.get("picture")
        if refresh_token:
            user.refresh_token = refresh_token
        logger.info(f"[AUTH] Updated user: {user.email}")
    
    db.commit()
    db.refresh(user)
    return user


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_settings(db: Session, user_id: int) -> Optional[dict]:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        return None
    return {
        "selected_model": settings.selected_model,
        "selected_provider": settings.selected_provider
    }


def update_user_settings(db: Session, user_id: int, data: dict) -> UserSettings:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.add(settings)
    
    for key, value in data.items():
        if hasattr(settings, key):
            setattr(settings, key, value)
    
    db.commit()
    db.refresh(settings)
    logger.info(f"[SETTINGS] Updated settings for user {user_id}")
    return settings


# Provider Config functions

def get_provider_config(db: Session, user_id: int, provider: str) -> Optional[dict]:
    config = db.query(ProviderConfig).filter(
        ProviderConfig.user_id == user_id,
        ProviderConfig.provider == provider
    ).first()
    if not config:
        return None
    return {
        "provider": config.provider,
        "enabled": config.enabled,
        "config": config.config
    }


def get_all_provider_configs(db: Session, user_id: int) -> list:
    configs = db.query(ProviderConfig).filter(ProviderConfig.user_id == user_id).all()
    result = []
    for c in configs:
        result.append({
            "provider": c.provider,
            "enabled": c.enabled,
            "config": c.config
        })
    return result


def update_provider_config(db: Session, user_id: int, provider: str, enabled: bool = None, config: dict = None) -> ProviderConfig:
    existing = db.query(ProviderConfig).filter(
        ProviderConfig.user_id == user_id,
        ProviderConfig.provider == provider
    ).first()
    
    if not existing:
        existing = ProviderConfig(
            user_id=user_id,
            provider=provider,
            enabled=enabled if enabled is not None else True,
            config=config or {}
        )
        db.add(existing)
    else:
        if enabled is not None:
            existing.enabled = enabled
        if config is not None:
            existing.config = config
    
    db.commit()
    db.refresh(existing)
    return existing


# Provider Model functions

def get_user_models(db: Session, user_id: int, provider: str) -> list:
    models = db.query(ProviderModel).filter(
        ProviderModel.user_id == user_id,
        ProviderModel.provider == provider
    ).all()
    return [{"model_name": m.model_name} for m in models]


def get_all_user_models(db: Session, user_id: int) -> dict:
    result = {}
    providers_list = ['ollama', 'ollama_cloud', 'openrouter', 'opencode_zen', 'opencode_go', 'openai', 'anthropic', 'google']
    for provider in providers_list:
        result[provider] = get_user_models(db, user_id, provider)
    return result


def update_user_models(db: Session, user_id: int, provider: str, models: list) -> list:
    print(f"[update_user_models] Called with provider={provider}, models={models}")
    
    existing = db.query(ProviderModel).filter(
        ProviderModel.user_id == user_id,
        ProviderModel.provider == provider
    ).all()
    
    print(f"[update_user_models] Found {len(existing)} existing models: {[m.model_name for m in existing]}")
    
    existing_by_name = {m.model_name: m for m in existing}
    model_names_in_request = set(m["model_name"] for m in models)
    
    # If empty array is sent, preserve existing models
    if not models:
        print(f"[update_user_models] Empty array sent, preserving existing models")
        return [{"model_name": m.model_name} for m in existing]
    
    # Add new models that don't exist yet
    for m in models:
        model_name = m["model_name"]
        
        if model_name not in existing_by_name:
            new_model = ProviderModel(
                user_id=user_id,
                provider=provider,
                model_name=model_name
            )
            db.add(new_model)
    
    db.commit()
    
    print(f"[update_user_models] Committed. Now fetching...")
    
    updated = db.query(ProviderModel).filter(
        ProviderModel.user_id == user_id,
        ProviderModel.provider == provider
    ).all()
    
    print(f"[update_user_models] Returning {len(updated)} models: {[m.model_name for m in updated]}")
    
    return [{"model_name": m.model_name} for m in updated]


def merge_user_models(db: Session, user_id: int, provider: str, new_models: list) -> list:
    """Merge new models with existing ones in the database.
    Add new models if they don't exist, keep existing configurations."""
    existing = db.query(ProviderModel).filter(
        ProviderModel.user_id == user_id,
        ProviderModel.provider == provider
    ).all()
    existing_names = {m.model_name for m in existing}

    for name in new_models:
        if name not in existing_names:
            new_model = ProviderModel(
                user_id=user_id,
                provider=provider,
                model_name=name
            )
            db.add(new_model)

    db.commit()
    return get_user_models(db, user_id, provider)


def get_default_provider_and_model(db: Session, user_id: int) -> tuple:
    configs = db.query(ProviderConfig).filter(
        ProviderConfig.user_id == user_id,
        ProviderConfig.enabled == True
    ).all()
    
    # If no configs exist, create defaults for this user
    if not configs:
        logger.info(f"[SETTINGS] Creating default configs for user {user_id}")
        
        # Create provider configs (no default models - user must fetch)
        for provider in ["ollama", "ollama_cloud", "openrouter", "opencode_zen", "opencode_go", "openai", "anthropic", "google"]:
            config = ProviderConfig(
                user_id=user_id,
                provider=provider,
                enabled=provider == "ollama",
                config={"url": "http://localhost:11434", "api_key": ""} if provider == "ollama" else {"url": "https://cloud.ollama.com", "api_key": ""} if provider == "ollama_cloud" else {"url": "https://openrouter.ai/api/v1", "api_key": ""} if provider == "openrouter" else {"url": "https://opencode.ai/zen/v1", "api_key": ""} if provider == "opencode_zen" else {"url": "https://opencode.ai/zen/go/v1", "api_key": ""} if provider == "opencode_go" else {}
            )
            db.add(config)
        
        db.commit()
        
        # Re-fetch configs
        configs = db.query(ProviderConfig).filter(
            ProviderConfig.user_id == user_id,
            ProviderConfig.enabled == True
        ).all()
    
    if not configs:
        return None, None
    
    # Step 1: Look for global default from user_settings
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if settings and settings.selected_model and settings.selected_provider:
        logger.info(f"[SETTINGS] Using global default: {settings.selected_provider}/{settings.selected_model}")
        return settings.selected_provider, settings.selected_model
    
    # Step 2: If no global default, find first enabled model for first enabled provider
    first_config = configs[0]
    first_model = db.query(ProviderModel).filter(
        ProviderModel.user_id == user_id,
        ProviderModel.provider == first_config.provider
    ).first()
    
    if first_model:
        logger.info(f"[SETTINGS] Auto-selecting first enabled model: {first_config.provider}/{first_model.model_name}")
        return first_config.provider, first_model.model_name
    
    return None, None