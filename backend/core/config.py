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
    #
    # Any OpenAI-compatible endpoint works; only these three values change.
    # Currently OpenCode Zen, on a free-tier model -- the "-free" suffix is how
    # they mark those. https://opencode.ai/zen/v1/models lists the ids and
    # needs no auth to read.
    #
    # laguna-s-2.1-free was measured end to end against the real pipeline at
    # ~44s, the fastest of the free models that return valid JSON for all five
    # steps. Measured alternatives: nemotron-3-ultra-free ~102s,
    # mimo-v2.5-free ~217s, x-preview-f-free ~373s. Avoid
    # nemotron-3.5-lightning-free -- it emits its reasoning instead of JSON and
    # fails even after the repair turn. deepseek-v4-flash-free is listed but
    # the gateway answers "Model is unavailable"; minimax needs paid credit.
    #
    # For Alibaba DashScope instead:
    #   AI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    AI_API_KEY: str = os.getenv("AI_API_KEY", "")
    AI_BASE_URL: str = os.getenv("AI_BASE_URL", "https://opencode.ai/zen/v1")
    AI_MODEL: str = os.getenv("AI_MODEL", "laguna-s-2.1-free")

    # How the model is asked for structured output, in order of how much it
    # demands of the provider:
    #
    # "prompt"      Nothing is sent but the prompt, which carries the JSON
    #               schema; we parse and validate the reply ourselves, with one
    #               repair turn. Works against any endpoint, which is why it is
    #               the default -- a provider that rejects an unknown parameter
    #               fails the whole request.
    # "json_object" Adds response_format={"type":"json_object"}. Slightly more
    #               reliable where supported.
    # "json_schema" AutoGen sends a strict JSON Schema and hands back an
    #               already-validated object. Few models support it; check
    #               before switching or expect a 400.
    AI_STRUCTURED_MODE: str = os.getenv("AI_STRUCTURED_MODE", "prompt")

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
        allowed = {"prompt", "json_object", "json_schema"}
        if v not in allowed:
            raise ValueError(f"AI_STRUCTURED_MODE must be one of {sorted(allowed)}, got {v!r}")
        return v

    @field_validator('AI_API_KEY')
    @classmethod
    def validate_ai_key(cls, v):
        if not v:
            raise ValueError(
                "AI_API_KEY environment variable is required. "
                "Get one from your AI provider (currently OpenCode Zen)."
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
