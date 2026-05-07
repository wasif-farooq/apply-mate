from typing import Optional
from sqlalchemy.orm import Session
from models import User, UserSettings, ProviderConfig, ProviderModel
from core.constants import DEFAULT_PROVIDERS, PROVIDER_DEFAULTS


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_google_id(self, google_id: str) -> Optional[User]:
        return self.db.query(User).filter(User.google_id == google_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def create(self, google_id: str, email: str, name: str = None, picture: str = None, refresh_token: str = None) -> User:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            picture=picture,
            refresh_token=refresh_token
        )
        self.db.add(user)
        self.db.flush()

        settings = UserSettings(user_id=user.id)
        self.db.add(settings)

        for provider in DEFAULT_PROVIDERS:
            config = ProviderConfig(
                user_id=user.id,
                provider=provider,
                enabled=provider == "ollama",
                config=PROVIDER_DEFAULTS.get(provider, {})
            )
            self.db.add(config)

        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User, **kwargs) -> User:
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_refresh_token(self, user: User, refresh_token: str) -> User:
        user.refresh_token = refresh_token
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user_id: int) -> bool:
        user = self.get_by_id(user_id)
        if user:
            self.db.delete(user)
            self.db.commit()
            return True
        return False