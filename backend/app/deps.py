from typing import Generator, Optional
from fastapi import Depends, Request, HTTPException
from sqlalchemy.orm import Session

from core.config import get_settings, Settings
from core.security import decode_token, verify_token
from models import User
from src.db.database import get_db as _get_db

settings = get_settings()


def get_db() -> Generator[Session, None, None]:
    yield from _get_db()


def get_settings_dep() -> Settings:
    return settings


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
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