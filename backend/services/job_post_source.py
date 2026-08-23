"""Where the job post text comes from.

Two callers supply it two ways:
  - the Chrome extension reads the post out of the LinkedIn DOM in the user's
    own logged-in session and posts the text up. This is the good path.
  - the web app posts a URL, and we scrape it server-side. This hits the
    logged-out DOM and an auth wall, so it is best-effort.

Everything downstream sees text either way.

NOTE: fetch_linkedin_post drives Playwright's *sync* API, which raises if it
is called from a thread that has a running event loop. It must therefore be
invoked from a threadpool, never awaited directly from the async apply route.
JobService.prepare_apply is the only legitimate caller.
"""
from __future__ import annotations

import logging
import re
from typing import Literal

import requests

from core.errors import JobPostUnreadable, LLMUpstreamError
from utils.linkedin_parser import fetch_linkedin_post

logger = logging.getLogger("job-applier")

MIN_POST_CHARS = 200

_ZERO_WIDTH = re.compile(r"[​-‏﻿]")
_MANY_SPACES = re.compile(r"[ \t]{2,}")
_MANY_NEWLINES = re.compile(r"\n{3,}")

PostSource = Literal["extension", "scrape"]


def normalize(text: str) -> str:
    text = _ZERO_WIDTH.sub("", text or "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _MANY_SPACES.sub(" ", text)
    text = _MANY_NEWLINES.sub("\n\n", text)
    return text.strip()


def _flatten(data: dict) -> str:
    parts = []
    for label, key in (
        ("Title", "title"),
        ("Company", "company"),
        ("Location", "location"),
    ):
        if data.get(key):
            parts.append(f"{label}: {data[key]}")
    if data.get("description"):
        parts.append(f"Description:\n{data['description']}")
    return "\n\n".join(parts)


def resolve_job_post_text(
    url: str | None, supplied_text: str | None
) -> tuple[str, PostSource]:
    if supplied_text and supplied_text.strip():
        text = normalize(supplied_text)
        if len(text) < MIN_POST_CHARS:
            raise JobPostUnreadable(
                "The captured post was too short to work with."
            )
        return text, "extension"

    if not url:
        raise JobPostUnreadable("No job post text and no URL to fetch.")

    try:
        data = fetch_linkedin_post(url)
    except requests.RequestException as exc:
        logger.warning("[JobPost] fetch failed for %s: %s", url, exc)
        raise LLMUpstreamError(f"Could not reach LinkedIn: {exc}") from exc

    text = normalize(_flatten(data))
    if len(text) < MIN_POST_CHARS:
        # Almost always the auth wall: the parse "succeeded" but every
        # selector missed, so we got a dict of empty strings.
        raise JobPostUnreadable(
            "Could not read that LinkedIn post. It may require sign-in. "
            "Paste the post text instead, or use the browser extension."
        )
    return text, "scrape"
