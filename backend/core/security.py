import secrets
from datetime import datetime, timedelta
from typing import Optional
import jwt
from core.config import get_settings

settings = get_settings()

if not settings.JWT_SECRET:
    settings.JWT_SECRET = secrets.token_hex(32)


def create_access_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)

    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def verify_token(token: str) -> Optional[int]:
    payload = decode_token(token)
    if payload:
        user_id = payload.get("sub")
        if user_id:
            return int(user_id)
    return None