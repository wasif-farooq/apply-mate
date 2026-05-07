from typing import Optional
from sqlalchemy.orm import Session
from models import ProviderConfig, ProviderModel
from core.constants import DEFAULT_PROVIDERS, PROVIDER_DEFAULTS, DEFAULT_MODELS


class ProviderRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_config(self, user_id: int, provider: str) -> Optional[ProviderConfig]:
        return self.db.query(ProviderConfig).filter(
            ProviderConfig.user_id == user_id,
            ProviderConfig.provider == provider
        ).first()

    def get_all_configs(self, user_id: int) -> list[ProviderConfig]:
        return self.db.query(ProviderConfig).filter(
            ProviderConfig.user_id == user_id
        ).all()

    def get_enabled_configs(self, user_id: int) -> list[ProviderConfig]:
        return self.db.query(ProviderConfig).filter(
            ProviderConfig.user_id == user_id,
            ProviderConfig.enabled == True
        ).all()

    def create_config(self, user_id: int, provider: str, enabled: bool = True, config: dict = None) -> ProviderConfig:
        provider_config = ProviderConfig(
            user_id=user_id,
            provider=provider,
            enabled=enabled,
            config=config or PROVIDER_DEFAULTS.get(provider, {})
        )
        self.db.add(provider_config)
        self.db.commit()
        self.db.refresh(provider_config)
        return provider_config

    def update_config(self, user_id: int, provider: str, enabled: bool = None, config: dict = None) -> ProviderConfig:
        existing = self.get_config(user_id, provider)

        if not existing:
            return self.create_config(user_id, provider, enabled=enabled if enabled is not None else True, config=config)

        if enabled is not None:
            existing.enabled = enabled
        if config is not None:
            existing.config = config

        self.db.commit()
        self.db.refresh(existing)
        return existing

    def get_models(self, user_id: int, provider: str) -> list[ProviderModel]:
        return self.db.query(ProviderModel).filter(
            ProviderModel.user_id == user_id,
            ProviderModel.provider == provider
        ).all()

    def get_all_models(self, user_id: int) -> dict[str, list[str]]:
        result = {}
        for provider in DEFAULT_PROVIDERS:
            models = self.get_models(user_id, provider)
            result[provider] = [{"model_name": m.model_name} for m in models]
        return result

    def add_model(self, user_id: int, provider: str, model_name: str) -> ProviderModel:
        existing = self.db.query(ProviderModel).filter(
            ProviderModel.user_id == user_id,
            ProviderModel.provider == provider,
            ProviderModel.model_name == model_name
        ).first()

        if existing:
            return existing

        model = ProviderModel(
            user_id=user_id,
            provider=provider,
            model_name=model_name
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def update_models(self, user_id: int, provider: str, model_names: list[str]) -> list[ProviderModel]:
        existing = self.get_models(user_id, provider)
        existing_names = {m.model_name for m in existing}
        request_names = set(model_names)

        for name in model_names:
            if name not in existing_names:
                self.add_model(user_id, provider, name)

        self.db.commit()
        return self.get_models(user_id, provider)

    def merge_models(self, user_id: int, provider: str, new_models: list[str]) -> list[dict]:
        for name in new_models:
            self.add_model(user_id, provider, name)
        self.db.commit()
        return [{"model_name": m.model_name} for m in self.get_models(user_id, provider)]

    def delete_model(self, user_id: int, provider: str, model_name: str) -> bool:
        model = self.db.query(ProviderModel).filter(
            ProviderModel.user_id == user_id,
            ProviderModel.provider == provider,
            ProviderModel.model_name == model_name
        ).first()

        if model:
            self.db.delete(model)
            self.db.commit()
            return True
        return False

    def get_default_provider_and_model(self, user_id: int) -> tuple[Optional[str], Optional[str]]:
        from repositories.settings_repo import SettingsRepository
        settings_repo = SettingsRepository(self.db)

        provider, model = settings_repo.get_selected_model(user_id)
        if provider and model:
            return provider, model

        configs = self.get_enabled_configs(user_id)
        if not configs:
            return None, None

        first_config = configs[0]
        models = self.get_models(user_id, first_config.provider)
        if models:
            return first_config.provider, models[0].model_name

        return None, None

    def ensure_defaults_exist(self, user_id: int) -> None:
        existing = self.get_all_configs(user_id)
        if existing:
            return

        for provider in DEFAULT_PROVIDERS:
            self.create_config(
                user_id,
                provider,
                enabled=provider == "ollama",
                config=PROVIDER_DEFAULTS.get(provider, {})
            )