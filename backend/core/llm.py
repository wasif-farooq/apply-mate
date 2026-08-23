"""The one model client.

There is exactly one provider (Alibaba DashScope, OpenAI-compatible) and one
model, chosen by env. No per-user keys, no provider switch, no runtime model
selection -- if you are looking for where the user picks a model, it was
deliberately deleted.

Two clients are built rather than one because AssistantAgent exposes no
per-call create args, so temperature has to be baked into the client.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from autogen_core.models import ChatCompletionClient, ModelFamily, ModelInfo
from autogen_ext.models.openai import OpenAIChatCompletionClient
from openai import (
    APIConnectionError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    InternalServerError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
)

from core.config import get_settings
from core.errors import (
    LLMError,
    LLMModelUnavailable,
    LLMNotConfigured,
    LLMQuotaExceeded,
    LLMRateLimited,
    LLMTimeout,
    LLMUpstreamError,
)

logger = logging.getLogger("job-applier")
settings = get_settings()


# Qwen is not in AutoGen's model registry, so every field has to be supplied.
#
# structured_output=False is the load-bearing one: it makes AutoGen reject a
# Pydantic output type up front with a clear error instead of letting DashScope
# 400 on a json_schema request the flash tier does not support. Flip it to True
# only together with AI_STRUCTURED_MODE=json_schema and a plus/max model.
#
# family stays UNKNOWN on purpose. Setting it to R1 makes AutoGen strip
# <think>...</think> out of content into .thought -- keep that in your back
# pocket if the model ever leaks reasoning into the response body and breaks
# JSON parsing, but do not enable it speculatively.
QWEN_MODEL_INFO: ModelInfo = {
    "vision": False,
    "function_calling": True,
    "json_output": True,
    "structured_output": False,
    "family": ModelFamily.UNKNOWN,
    "multiple_system_messages": False,
}


@dataclass(frozen=True)
class ModelClients:
    """Same model, two temperatures."""

    analytic: ChatCompletionClient   # extraction, matching, critique
    creative: ChatCompletionClient   # writing the email


def _build_client(temperature: float) -> ChatCompletionClient:
    model_info = dict(QWEN_MODEL_INFO)
    create_args: dict = {}

    if settings.AI_STRUCTURED_MODE == "json_schema":
        model_info["structured_output"] = True
    else:
        # DashScope refuses this unless the literal word "json" appears
        # somewhere in the messages -- prompts.json_contract() guarantees it.
        create_args["response_format"] = {"type": "json_object"}

    # Note: never pass max_tokens. In JSON mode a truncated response is
    # invalid JSON rather than a short answer.
    return OpenAIChatCompletionClient(
        model=settings.AI_MODEL,
        api_key=settings.DASHSCOPE_API_KEY,
        base_url=settings.DASHSCOPE_BASE_URL,
        model_info=model_info,
        temperature=temperature,
        timeout=settings.AI_TIMEOUT_SECONDS,
        max_retries=0,  # retries live in services/agents/retry.py, one layer only
        include_name_in_message=False,
        **create_args,
    )


_clients: ModelClients | None = None


def init_model_clients() -> None:
    """Called once from the FastAPI lifespan.

    The clients wrap httpx pools that bind to the event loop that first uses
    them, so this is only safe because the apply path is async end-to-end and
    the process has a single loop. If anything ever reintroduces asyncio.run()
    per request, this singleton breaks on the second request.
    """
    global _clients
    if _clients is not None:
        return
    _clients = ModelClients(
        analytic=_build_client(settings.AI_TEMPERATURE_ANALYSIS),
        creative=_build_client(settings.AI_TEMPERATURE_WRITING),
    )
    logger.info(
        "[LLM] clients ready: model=%s mode=%s base_url=%s",
        settings.AI_MODEL,
        settings.AI_STRUCTURED_MODE,
        settings.DASHSCOPE_BASE_URL,
    )


async def close_model_clients() -> None:
    global _clients
    if _clients is None:
        return
    for client in (_clients.analytic, _clients.creative):
        try:
            await client.close()
        except Exception:  # noqa: BLE001 - shutdown must not raise
            logger.warning("[LLM] client close failed", exc_info=True)
    _clients = None


def get_model_clients() -> ModelClients:
    if _clients is None:
        raise LLMNotConfigured("Model clients were never initialised.")
    return _clients


# DashScope error codes, as returned in body["error"]["code"]. Anything not
# listed falls through to LLMRateLimited, which is the safe default because it
# is the only retryable branch -- an unknown code is more likely a transient
# throttle than a permanent billing failure.
_QUOTA_CODES = {
    "InsufficientQuota",
    "Arrearage",
    "FreeUsageLimit",
    "FreeUsageLimitError",
    "AllocationQuotaExceeded",
}


def _error_code(exc: Exception) -> str:
    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        err = body.get("error")
        if isinstance(err, dict):
            return str(err.get("code") or "")
    return ""


def classify_openai_error(exc: Exception) -> LLMError:
    """Map a provider exception onto our taxonomy.

    Dispatch on exception type and the structured error code, never on
    substrings of the message -- the code this replaces treated any error text
    containing "404" as a missing model, which fired on job posts that happened
    to mention a room number.
    """
    if isinstance(exc, (AuthenticationError, PermissionDeniedError)):
        return LLMNotConfigured(str(exc))

    if isinstance(exc, NotFoundError):
        return LLMModelUnavailable(f"Model {settings.AI_MODEL!r} was not found at the endpoint.")

    if isinstance(exc, RateLimitError):
        code = _error_code(exc)
        if code in _QUOTA_CODES:
            return LLMQuotaExceeded(str(exc))
        retry_after = None
        response = getattr(exc, "response", None)
        if response is not None:
            raw = response.headers.get("retry-after") if hasattr(response, "headers") else None
            if raw:
                try:
                    retry_after = float(raw)
                except ValueError:
                    retry_after = None
        return LLMRateLimited(str(exc), retry_after=retry_after)

    if isinstance(exc, APITimeoutError):
        return LLMTimeout(str(exc))

    if isinstance(exc, (InternalServerError, APIConnectionError)):
        return LLMUpstreamError(str(exc))

    if isinstance(exc, BadRequestError):
        # A 400 from DashScope means we sent something wrong. It is never the
        # end user's fault and must not become an HTTP 400.
        text = str(exc).lower()
        if "model" in text or "response_format" in text:
            return LLMModelUnavailable(str(exc))
        return LLMUpstreamError(str(exc))

    status = getattr(exc, "status_code", None)
    if isinstance(status, int) and status >= 500:
        return LLMUpstreamError(str(exc))

    return LLMUpstreamError(str(exc))
