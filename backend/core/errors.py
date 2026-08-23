"""Domain errors for the AI pipeline.

Deliberately free of HTTP knowledge -- main.py maps these to status codes. The
point is that a caller can tell "the model is misconfigured" (our fault, 5xx)
apart from "this post has no readable content" (the user's, 4xx). The old code
collapsed every one of these into ValueError("Agentic AI processing failed"),
which the route then reported as 400.
"""


class LLMError(Exception):
    """Base for anything that went wrong talking to the model provider."""


class LLMNotConfigured(LLMError):
    """API key missing, rejected, or lacking permission. Never the user's fault."""


class LLMModelUnavailable(LLMError):
    """Unknown model id, or the endpoint rejected our request shape."""


class LLMRateLimited(LLMError):
    """Throttled by the provider. Retryable; retries were already exhausted."""

    def __init__(self, message: str = "", retry_after: float | None = None):
        super().__init__(message)
        self.retry_after = retry_after


class LLMQuotaExceeded(LLMError):
    """Billing or free-tier limit hit. Retrying will not help."""


class LLMUpstreamError(LLMError):
    """5xx or connection failure at the provider."""


class LLMTimeout(LLMError):
    """The provider did not answer within AI_TIMEOUT_SECONDS."""


class LLMOutputInvalid(LLMError):
    """The model's response would not validate against the expected schema."""

    def __init__(self, step: str, schema: str, raw: str = ""):
        super().__init__(f"{step} returned output that does not match {schema}")
        self.step = step
        self.schema = schema
        self.raw = raw


class JobPostUnreadable(Exception):
    """No usable job-post text: scrape hit a login wall, or the text was empty."""


class ResumeTextUnavailable(Exception):
    """A resume was selected but no text could be recovered from it."""


class NoRecipientFound(Exception):
    """No recipient address in the post, and the caller supplied none."""
