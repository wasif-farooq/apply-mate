"""PDF text extraction.

Called once per resume, at upload time. The text is then stored on the row and
that is what the model sees -- nothing in the AI path opens a file.
"""
from __future__ import annotations

import logging
import os

from core.errors import ResumeTextUnavailable

logger = logging.getLogger("job-applier")

MAX_PAGES = 20
MIN_CHARS = 100


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF, or raise ResumeTextUnavailable.

    page.extract_text() returns None for image-only pages, which the previous
    "\\n".join(...) turned into a TypeError. A scanned resume is a real thing
    users upload, so it gets a clear error rather than a 500.
    """
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    if not os.path.exists(file_path):
        raise ResumeTextUnavailable(f"Resume file not found: {file_path}")

    try:
        reader = PdfReader(file_path)
    except PdfReadError as exc:
        raise ResumeTextUnavailable(f"Could not read the PDF: {exc}") from exc

    if reader.is_encrypted:
        raise ResumeTextUnavailable(
            "That PDF is password protected. Upload an unprotected copy."
        )

    pages = reader.pages[:MAX_PAGES]
    if len(reader.pages) > MAX_PAGES:
        logger.info(
            "[Resume] %s has %d pages, reading first %d",
            os.path.basename(file_path),
            len(reader.pages),
            MAX_PAGES,
        )

    chunks = []
    for page in pages:
        try:
            text = page.extract_text()
        except Exception:  # noqa: BLE001 - one bad page should not lose the rest
            logger.warning("[Resume] page extraction failed", exc_info=True)
            continue
        if text:
            chunks.append(text)

    text = "\n".join(chunks).strip()

    if len(text) < MIN_CHARS:
        raise ResumeTextUnavailable(
            "No readable text in that PDF. It looks like a scan or an image; "
            "upload a text-based PDF."
        )

    return text
