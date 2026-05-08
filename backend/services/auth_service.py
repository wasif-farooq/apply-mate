import logging
import requests
from authlib.integrations.requests_client import OAuth2Session
from models.schemas import GoogleUserInfo
from repositories.user_repo import UserRepository
from core.config import get_settings
from core.constants import GOOGLE_SCOPES

logger = logging.getLogger("job-applier")


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
        self.settings = get_settings()

    def get_google_auth_url(self) -> tuple[str, str]:
        logger.info("[Auth] Generating Google OAuth URL")

        client = OAuth2Session(
            self.settings.GOOGLE_CLIENT_ID,
            self.settings.GOOGLE_CLIENT_SECRET,
            scope=GOOGLE_SCOPES
        )

        uri, state = client.create_authorization_url(
            "https://accounts.google.com/o/oauth2/v2/auth",
            redirect_uri=self.settings.GOOGLE_REDIRECT_URI,
            access_type="offline",
            prompt="consent"
        )

        logger.info(f"[Auth] Auth URL generated, state: {state[:20]}...")
        return uri, state

    def exchange_code_for_tokens(self, code: str, state: str) -> dict:
        logger.info("[Auth] Exchanging code for tokens")

        client = OAuth2Session(
            self.settings.GOOGLE_CLIENT_ID,
            self.settings.GOOGLE_CLIENT_SECRET,
            state=state
        )

        token = client.fetch_token(
            "https://oauth2.googleapis.com/token",
            code=code,
            redirect_uri=self.settings.GOOGLE_REDIRECT_URI,
            client_id=self.settings.GOOGLE_CLIENT_ID,
            client_secret=self.settings.GOOGLE_CLIENT_SECRET,
            grant_type="authorization_code"
        )

        logger.info(f"[Auth] Token exchange successful")
        return token

    def get_google_user_info(self, access_token: str) -> GoogleUserInfo:
        logger.info("[Auth] Fetching Google user info")

        headers = {"Authorization": f"Bearer {access_token}"}
        resp = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=headers)
        logger.info(f"[Auth] Userinfo response status: {resp.status_code}")
        resp.raise_for_status()

        data = resp.json()
        return GoogleUserInfo(
            id=data.get("id"),
            email=data.get("email"),
            name=data.get("name"),
            picture=data.get("picture")
        )

    def authenticate_google(self, code: str, state: str) -> dict:
        token_data = self.exchange_code_for_tokens(code, state)
        google_user = self.get_google_user_info(token_data["access_token"])

        user = self.user_repo.get_by_google_id(google_user.id)

        if not user:
            logger.info(f"[Auth] Creating new user: {google_user.email}")
            user = self.user_repo.create(
                google_id=google_user.id,
                email=google_user.email,
                name=google_user.name,
                picture=google_user.picture,
                refresh_token=token_data.get("refresh_token")
            )
        else:
            logger.info(f"[Auth] Updating existing user: {google_user.email}")
            refresh_token = token_data.get("refresh_token")
            self.user_repo.update(
                user,
                email=google_user.email,
                name=google_user.name,
                picture=google_user.picture,
                **({"refresh_token": refresh_token} if refresh_token else {})
            )

        return user

    def get_google_auth_url_extension(self, redirect_uri: str) -> str:
        """Generate Google OAuth URL for extension with custom redirect URI"""
        logger.info(f"[Auth] Generating extension OAuth URL, redirect: {redirect_uri[:50]}...")

        client_id = self.settings.EXTENSION_GOOGLE_CLIENT_ID or self.settings.GOOGLE_CLIENT_ID
        client_secret = self.settings.EXTENSION_GOOGLE_CLIENT_SECRET or self.settings.GOOGLE_CLIENT_SECRET

        client = OAuth2Session(
            client_id,
            client_secret,
            scope=GOOGLE_SCOPES
        )

        uri, state = client.create_authorization_url(
            "https://accounts.google.com/o/oauth2/v2/auth",
            redirect_uri=redirect_uri,
            access_type="offline",
            prompt="consent"
        )

        logger.info(f"[Auth] Extension auth URL generated, state: {state[:20]}...")
        return uri

    def authenticate_google_extension(self, code: str):
        """Authenticate Google user for extension - handles own redirect"""
        logger.info("[Auth] Authenticating extension user")

        client_id = self.settings.EXTENSION_GOOGLE_CLIENT_ID or self.settings.GOOGLE_CLIENT_ID
        client_secret = self.settings.EXTENSION_GOOGLE_CLIENT_SECRET or self.settings.GOOGLE_CLIENT_SECRET

        client = OAuth2Session(
            client_id,
            client_secret
        )

        token = client.fetch_token(
            "https://oauth2.googleapis.com/token",
            code=code,
            client_id=client_id,
            client_secret=client_secret,
            grant_type="authorization_code"
        )

        google_user = self.get_google_user_info(token["access_token"])

        user = self.user_repo.get_by_google_id(google_user.id)

        if not user:
            logger.info(f"[Auth] Creating new extension user: {google_user.email}")
            user = self.user_repo.create(
                google_id=google_user.id,
                email=google_user.email,
                name=google_user.name,
                picture=google_user.picture,
                refresh_token=token.get("refresh_token")
            )
        else:
            logger.info(f"[Auth] Updating existing extension user: {google_user.email}")
            refresh_token = token.get("refresh_token")
            self.user_repo.update(
                user,
                email=google_user.email,
                name=google_user.name,
                picture=google_user.picture,
                **({"refresh_token": refresh_token} if refresh_token else {})
            )

        return user