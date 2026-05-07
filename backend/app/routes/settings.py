import logging
import requests
from fastapi import APIRouter, Depends, HTTPException, Body, Query
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
    try:
        headers = {"Authorization": f"Bearer {body.api_key}"}
        response = requests.get(
            "https://cloud.ollama.com/api/tags",
            headers=headers,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            models = [m.get("name", "") for m in data.get("models", []) if m.get("name")]

            provider_repo = ProviderRepository(db)
            all_models = provider_repo.merge_models(current_user.id, "ollama_cloud", models)
            return {"models": all_models}
        elif response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid API key")
        else:
            raise HTTPException(status_code=response.status_code, detail=f"Failed: {response.text}")
    except requests.RequestException as e:
        logger.error(f"[Settings] Ollama Cloud fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        base_url = f"https://opencode.ai/zen/{provider_type}/v1"
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