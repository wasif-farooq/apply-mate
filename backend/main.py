import sys
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from src.db.database import init_db
from utils.logger import logger

from app.routes.auth import router as auth_router
from app.routes.settings import router as settings_router
from app.routes.apply import router as apply_router
from app.routes.applications import router as applications_router
from app.routes.extension_auth import router as extension_auth_router

settings = get_settings()

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(settings_router)
app.include_router(apply_router)
app.include_router(applications_router)
app.include_router(extension_auth_router)


@app.on_event("startup")
def startup():
    init_db()
    logger.info("[DB] Database initialized")


@app.get("/")
def root():
    return {"status": "ok", "message": "ApplyMate API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)