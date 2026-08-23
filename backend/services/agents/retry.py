"""Retry for provider calls.

One retry layer, applied per pipeline step. The client is built with
max_retries=0 so the openai SDK does not silently add a second layer.

This replaces a __getattr__ proxy that wrapped the model client and (a) caught
bare Exception including CancelledError, (b) classified errors by substring,
(c) never wrapped create_stream at all, and (d) slept 1.5s before every call
process-wide, serialising unrelated users against each other.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable, TypeVar

from openai import APIError

from core.config import get_settings
from core.llm import classify_openai_error
from core.errors import (
    LLMError,
    LLMRateLimited,
    LLMTimeout,
    LLMUpstreamError,
)

logger = logging.getLogger("job-applier")
settings = get_settings()

T = TypeVar("T")

# Everything else -- quota exhausted, unknown model, bad key, invalid output --
# fails the same way on the second attempt as on the first.
RETRYABLE = (LLMRateLimited, LLMUpstreamError, LLMTimeout)

_BASE_DELAY = 2.0
_MAX_DELAY = 20.0


async def with_llm_retry(fn: Callable[[], Awaitable[T]], *, step: str) -> T:
    attempts = max(1, settings.AI_MAX_RETRIES)
    last: LLMError | None = None

    for attempt in range(attempts):
        try:
            return await fn()
        except LLMError as exc:
            last = exc
        except APIError as exc:
            last = classify_openai_error(exc)

        if not isinstance(last, RETRYABLE) or attempt == attempts - 1:
            raise last

        delay = min(_BASE_DELAY * (2**attempt), _MAX_DELAY)
        retry_after = getattr(last, "retry_after", None)
        if retry_after:
            delay = min(float(retry_after), _MAX_DELAY)

        logger.warning(
            "[LLM] %s failed (%s), retrying in %.1fs (attempt %d/%d)",
            step,
            type(last).__name__,
            delay,
            attempt + 1,
            attempts,
        )
        await asyncio.sleep(delay)

    raise last  # pragma: no cover - loop always returns or raises above
