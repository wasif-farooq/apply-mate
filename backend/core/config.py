import os
from functools import lru_cache
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        validate_default=True,
    )

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
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # AI -- one server-side model for everyone. There is deliberately no
    # per-user provider/model/key: see PLANS or git history for the rip-out.
    DASHSCOPE_API_KEY: str = os.getenv("DASHSCOPE_API_KEY", "")
    DASHSCOPE_BASE_URL: str = os.getenv(
        "DASHSCOPE_BASE_URL",
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    )
    AI_MODEL: str = os.getenv("AI_MODEL", "qwen3.5-flash")

    # "json_object": the model is asked for a JSON object and we validate it
    #   ourselves. This is the portable path and works on the flash tiers.
    # "json_schema": AutoGen sends a strict JSON Schema via response_format and
    #   hands back an already-validated model. Only the plus/max tiers support
    #   it -- flip AI_MODEL at the same time or DashScope will 400.
    AI_STRUCTURED_MODE: str = os.getenv("AI_STRUCTURED_MODE", "json_object")

    AI_TEMPERATURE_ANALYSIS: float = float(os.getenv("AI_TEMPERATURE_ANALYSIS", "0.1"))
    AI_TEMPERATURE_WRITING: float = float(os.getenv("AI_TEMPERATURE_WRITING", "0.7"))
    AI_TIMEOUT_SECONDS: float = float(os.getenv("AI_TIMEOUT_SECONDS", "90"))
    AI_MAX_RETRIES: int = int(os.getenv("AI_MAX_RETRIES", "3"))
    AI_MAX_REVISIONS: int = int(os.getenv("AI_MAX_REVISIONS", "2"))
    AI_MAX_POST_CHARS: int = int(os.getenv("AI_MAX_POST_CHARS", "24000"))
    AI_MAX_RESUME_CHARS: int = int(os.getenv("AI_MAX_RESUME_CHARS", "24000"))

    # Gmail
    GMAIL_SENDER_NAME: str = os.getenv("GMAIL_SENDER_NAME", "Wasif Farooq")
    GMAIL_SCOPES: list[str] = ["https://www.googleapis.com/auth/gmail.send"]

# CORS
    CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    ]

    @field_validator('DATABASE_URL')
    @classmethod
    def validate_database_url(cls, v):
        if not v:
            raise ValueError("DATABASE_URL environment variable is required")
        return v

    @field_validator('JWT_SECRET')
    @classmethod
    def validate_jwt_secret(cls, v):
        if not v:
            raise ValueError(
                "JWT_SECRET environment variable is required. "
                "Generate one with: openssl rand -base64 32"
            )
        return v

    @field_validator('AI_STRUCTURED_MODE')
    @classmethod
    def validate_structured_mode(cls, v):
        allowed = {"json_object", "json_schema"}
        if v not in allowed:
            raise ValueError(f"AI_STRUCTURED_MODE must be one of {sorted(allowed)}, got {v!r}")
        return v

    @field_validator('DASHSCOPE_API_KEY')
    @classmethod
    def validate_dashscope_key(cls, v):
        if not v:
            raise ValueError(
                "DASHSCOPE_API_KEY environment variable is required. "
                "Create one in the Alibaba Cloud Model Studio console."
            )
        return v

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if v is None or v == '':
            return [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8000",
                "http://127.0.0.1:8000",
            ]
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG").upper()
    LOG_DIR: str = "logs"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
