import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.exceptions import AuthenticationError
from core.config import get_settings
from core.security import create_access_token
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