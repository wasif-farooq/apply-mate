"""Finding the recipient address in a job post.

This used to exist in three places that disagreed with each other: here, in
the agent tools (which additionally dropped any address whose local part began
with "on" or "at", killing onboarding@ and attn@), and in the LangChain email
generator. This is now the only copy.
"""
from __future__ import annotations

import re
from typing import Optional

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# Addresses that are never a hiring contact.
_NOISE_DOMAINS = {
    "example.com",
    "email.com",
    "domain.com",
    "yourcompany.com",
    "sentry.io",
    "linkedin.com",
    "licdn.com",
}
_NOISE_LOCALPARTS = {
    "noreply",
    "no-reply",
    "donotreply",
    "do-not-reply",
    "postmaster",
    "mailer-daemon",
    "unsubscribe",
}
# Image/asset filenames pick up @2x-style suffixes and look like addresses.
_ASSET_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js")


def _is_plausible(address: str) -> bool:
    lowered = address.lower()
    if lowered.endswith(_ASSET_SUFFIXES):
        return False
    local, _, domain = lowered.partition("@")
    if domain in _NOISE_DOMAINS:
        return False
    if local in _NOISE_LOCALPARTS:
        return False
    return True


def find_email_candidates(
    text: str, context_chars: int = 200
) -> list[tuple[str, str]]:
    """Return (address, surrounding_text) pairs, de-duplicated, in order.

    The context is what lets the recipient-picker agent tell "send your CV to
    X" apart from an address that happens to appear in a signature block.
    """
    if not text:
        return []

    seen: set[str] = set()
    out: list[tuple[str, str]] = []
    for match in EMAIL_RE.finditer(text):
        address = match.group()
        if not _is_plausible(address):
            continue
        key = address.lower()
        if key in seen:
            continue
        seen.add(key)
        start = max(0, match.start() - context_chars)
        end = min(len(text), match.end() + context_chars)
        out.append((address, text[start:end].replace("\n", " ").strip()))
    return out


def extract_email(text: str) -> Optional[str]:
    """First plausible address, or None. Used as a last-resort fallback."""
    candidates = find_email_candidates(text, context_chars=0)
    return candidates[0][0] if candidates else None
