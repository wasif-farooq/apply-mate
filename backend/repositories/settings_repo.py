from typing import Optional
from sqlalchemy.orm import Session
from models import UserSettings


class SettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: int) -> Optional[UserSettings]:
        return self.db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

    def create(self, user_id: int) -> UserSettings:
        settings = UserSettings(user_id=user_id)
        self.db.add(settings)
        self.db.commit()
        self.db.refresh(settings)
        return settings

    def update(self, user_id: int, **kwargs) -> UserSettings:
        settings = self.get_by_user_id(user_id)
        if not settings:
            settings = self.create(user_id)

        for key, value in kwargs.items():
            if hasattr(settings, key):
                setattr(settings, key, value)

        self.db.commit()
        self.db.refresh(settings)
        return settings
