import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))

load_dotenv()

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402

from core.config import get_settings  # noqa: E402
from core.limiter import limiter  # noqa: E402
from core.llm import close_model_clients, init_model_clients  # noqa: E402
from core.errors import (  # noqa: E402
    JobPostUnreadable,
    LLMModelUnavailable,
    LLMNotConfigured,
    LLMOutputInvalid,
    LLMQuotaExceeded,
    LLMRateLimited,
    LLMTimeout,
    LLMUpstreamError,
    NoRecipientFound,
    ResumeTextUnavailable,
)
from utils.logger import logger  # noqa: E402

from app.routes.applications import router as applications_router  # noqa: E402
from app.routes.apply import router as apply_router  # noqa: E402
from app.routes.auth import router as auth_router  # noqa: E402
from app.routes.extension_auth import router as extension_auth_router  # noqa: E402
from app.routes.feed import router as feed_router  # noqa: E402
from app.routes.settings import router as settings_router  # noqa: E402

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Required env vars are validated by Settings() at import time -- see
    # core/config.py. Schema is applied by entrypoint.sh before the app starts;
    # nothing creates tables at runtime.
    init_model_clients()
    logger.info(
        f"[Config] {settings.APP_NAME} v{settings.APP_VERSION}, model: {settings.AI_MODEL}"
    )
    yield
    await close_model_clients()


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

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
app.include_router(feed_router)

app.state.limiter = limiter


def _json(status_code: int, detail: str, headers: dict | None = None) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail}, headers=headers)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return _json(429, "Rate limit exceeded. Please try again later.")


# Domain errors are mapped here rather than caught in the routes. The previous
# code wrapped the whole apply path in `except Exception` and re-raised
# everything as HTTP 400, so a missing API key and a dead upstream both reached
# the user as "400 Bad Request: Agentic AI processing failed" -- a server fault
# reported as bad input, telling the user to retry something that could not
# succeed.


async def llm_not_configured_handler(request: Request, exc: LLMNotConfigured):
    logger.critical("[LLM] not configured: %s", exc)
    return _json(500, "AI service is not configured.")


async def llm_model_unavailable_handler(request: Request, exc: LLMModelUnavailable):
    logger.error("[LLM] model %s unavailable: %s", settings.AI_MODEL, exc)
    return _json(500, "AI model is misconfigured.")


async def llm_output_invalid_handler(request: Request, exc: LLMOutputInvalid):
    logger.error("[LLM] invalid output from %s: %s", exc.step, exc.raw[:200])
    return _json(502, "AI service returned an unusable response.")


async def llm_unavailable_handler(request: Request, exc: Exception):
    logger.warning("[LLM] upstream unavailable: %s", exc)
    return _json(503, "AI service temporarily unavailable.", {"Retry-After": "30"})


async def llm_rate_limited_handler(request: Request, exc: LLMRateLimited):
    retry_after = int(exc.retry_after or 30)
    return _json(429, "AI service is busy. Try again shortly.", {"Retry-After": str(retry_after)})


async def llm_quota_handler(request: Request, exc: LLMQuotaExceeded):
    # 429 to the caller, but this is an ops event: someone has to top up.
    logger.error("[LLM] quota exhausted: %s", exc)
    return _json(429, "AI usage quota exhausted. Please try again later.")


async def unprocessable_handler(request: Request, exc: Exception):
    return _json(422, str(exc))


app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_exception_handler(LLMNotConfigured, llm_not_configured_handler)
app.add_exception_handler(LLMModelUnavailable, llm_model_unavailable_handler)
app.add_exception_handler(LLMOutputInvalid, llm_output_invalid_handler)
app.add_exception_handler(LLMUpstreamError, llm_unavailable_handler)
app.add_exception_handler(LLMTimeout, llm_unavailable_handler)
app.add_exception_handler(LLMRateLimited, llm_rate_limited_handler)
app.add_exception_handler(LLMQuotaExceeded, llm_quota_handler)
app.add_exception_handler(JobPostUnreadable, unprocessable_handler)
app.add_exception_handler(ResumeTextUnavailable, unprocessable_handler)
app.add_exception_handler(NoRecipientFound, unprocessable_handler)


@app.get("/")
def root():
    return {"status": "ok", "message": "ApplyBuddy API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
