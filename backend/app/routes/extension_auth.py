import logging
import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db
from core.config import get_settings
from core.security import create_access_token
from repositories.user_repo import UserRepository
from services.auth_service import AuthService

logger = logging.getLogger("job-applier")

router = APIRouter(prefix="/auth", tags=["extension-auth"])
settings = get_settings()


class ExtensionTokenRequest(BaseModel):
    token: str


@router.post("/extension/token")
def extension_token_auth(
    request: ExtensionTokenRequest,
    db: Session = Depends(get_db)
):
    """Handle extension OAuth token - create session using Google's token"""
    try:
        # Verify the token with Google
        response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {request.token}'}
        )

        if not response.ok:
            raise HTTPException(status_code=401, detail="Invalid Google token")

        google_user = response.json()

        # Create or update user in database
        user_repo = UserRepository(db)
        user = user_repo.get_by_google_id(google_user['id'])

        if not user:
            logger.info(f"[Auth] Creating new extension user: {google_user['email']}")
            user = user_repo.create(
                google_id=google_user['id'],
                email=google_user['email'],
                name=google_user.get('name'),
                picture=google_user.get('picture')
            )
        else:
            logger.info(f"[Auth] Updating existing extension user: {google_user['email']}")
            user.email = google_user['email']
            user.name = google_user.get('name')
            user.picture = google_user.get('picture')
            db.commit()

        # Create our own session token
        session_token = create_access_token(user.id)

        logger.info(f"[Auth] Extension user logged in: {user.email}")
        return {
            "access_token": session_token,
            "token_type": "bearer",
            "email": user.email,
            "name": user.name
        }
    except Exception as e:
        logger.error(f"[Auth] Extension token auth failed: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.get("/google")
def google_auth(
    state: str = Query(...),
    redirect_uri: str = Query(...),
    db: Session = Depends(get_db)
):
    """Initiate Google OAuth for extension - returns redirect URL"""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.error("[Auth] Google OAuth not configured")
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo)

    try:
        auth_url = auth_service.get_google_auth_url_extension(redirect_uri)
        
        from utils.logger import logger
        logger.info(f"[Auth] Extension auth URL generated, redirect_uri: {redirect_uri[:50]}...")
        
        return RedirectResponse(url=auth_url)
    except Exception as e:
        logger.error(f"[Auth] Extension login failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ExtensionCallbackRequest(BaseModel):
    code: str


@router.post("/callback")
def auth_callback(
    code: str = Query(...),
    db: Session = Depends(get_db)
):
    """Handle OAuth callback for extension - returns token directly"""
    user_repo = UserRepository(db)
    auth_service = AuthService(user_repo)

    try:
        user = auth_service.authenticate_google_extension(code)
        token = create_access_token(user.id)

        logger.info(f"[Auth] Extension user logged in: {user.email}")
        return {
            "access_token": token,
            "token_type": "bearer",
            "email": user.email,
            "name": user.name
        }
    except Exception as e:
        logger.error(f"[Auth] Extension callback failed: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")