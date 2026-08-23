from enum import Enum


class ApplicationStatus(str, Enum):
    GENERATED = "generated"
    SENT = "sent"
    FAILED = "failed"


class PostType(str, Enum):
    """What a captured LinkedIn feed post turned out to be."""

    JOB = "job"
    GENERAL = "general"
    AD = "ad"
    UNKNOWN = "unknown"


class FeedJobStatus(str, Enum):
    NEW = "new"          # captured, not yet scored
    SCORED = "scored"    # relevance known, awaiting review
    QUEUED = "queued"    # user approved, waiting to apply
    APPLIED = "applied"
    SKIPPED = "skipped"  # user dismissed
    FAILED = "failed"


class ApplyMode(str, Enum):
    EMAIL = "email"
    EASY_APPLY = "easy_apply"
