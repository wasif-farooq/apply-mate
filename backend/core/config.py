import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "ApplyBuddy API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", f"{FRONTEND_URL}/auth/google/callback")

    # Extension Google OAuth (separate client for Chrome extension)
    EXTENSION_GOOGLE_CLIENT_ID: str = os.getenv("EXTENSION_GOOGLE_CLIENT_ID", "")
    EXTENSION_GOOGLE_CLIENT_SECRET: str = os.getenv("EXTENSION_GOOGLE_CLIENT_SECRET", "")

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://applybuddy:applybuddy123@localhost:5432/applybuddy"
    )

    # AI Provider defaults
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "ollama").lower()
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma4:e2b")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_MODEL: str = os.getenv("GOOGLE_MODEL", "gemini-1.5-pro")

    # Gmail
    GMAIL_SENDER_NAME: str = os.getenv("GMAIL_SENDER_NAME", "Wasif Farooq")
    GMAIL_SCOPES: list[str] = ["https://www.googleapis.com/auth/gmail.send"]

    # CORS
    CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG").upper()
    LOG_DIR: str = "logs"


@lru_cache()
def get_settings() -> Settings:
    return Settings()