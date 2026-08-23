from typing import Generator

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.config import Settings, get_settings
from core.security import decode_token
from db.database import get_db as _get_db
from models import User
from repositories.application_repo import ApplicationRepository
from repositories.resume_repo import ResumeRepository
from repositories.settings_repo import SettingsRepository
from repositories.user_repo import UserRepository
from services.job_service import JobService

settings = get_settings()


def get_db() -> Generator[Session, None, None]:
    yield from _get_db()


def get_settings_dep() -> Settings:
    return settings


def get_user_repo(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_settings_repo(db: Session = Depends(get_db)) -> SettingsRepository:
    return SettingsRepository(db)


def get_application_repo(db: Session = Depends(get_db)) -> ApplicationRepository:
    return ApplicationRepository(db)


def get_resume_repo(db: Session = Depends(get_db)) -> ResumeRepository:
    return ResumeRepository(db)


def get_job_service(
    user_repo: UserRepository = Depends(get_user_repo),
    settings_repo: SettingsRepository = Depends(get_settings_repo),
    application_repo: ApplicationRepository = Depends(get_application_repo),
    resume_repo: ResumeRepository = Depends(get_resume_repo),
) -> JobService:
    return JobService(
        user_repo=user_repo,
        settings_repo=settings_repo,
        application_repo=application_repo,
        resume_repo=resume_repo,
    )


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        token = request.cookies.get("session_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
