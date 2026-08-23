import logging

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db
from core.config import get_settings
from core.security import create_access_token
from repositories.user_repo import UserRepository

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
        raise HTTPException(status_code=500, detail="Authentication failed")
