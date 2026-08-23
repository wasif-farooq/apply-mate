import pytest

from core.errors import JobPostUnreadable
from services import job_post_source
from services.job_post_source import normalize, resolve_job_post_text

LONG = "Senior Backend Engineer at Acme. " * 20


def test_supplied_text_wins_and_skips_scraping(monkeypatch):
    def boom(url):  # pragma: no cover - must not be reached
        raise AssertionError("scraper was called even though text was supplied")

    monkeypatch.setattr(job_post_source, "fetch_linkedin_post", boom)

    text, source = resolve_job_post_text("https://linkedin.com/posts/x", LONG)
    assert source == "extension"
    assert "Senior Backend Engineer" in text


def test_short_supplied_text_is_rejected():
    with pytest.raises(JobPostUnreadable):
        resolve_job_post_text("https://linkedin.com/posts/x", "hiring!")


def test_falls_back_to_scraping_when_no_text(monkeypatch):
    monkeypatch.setattr(
        job_post_source,
        "fetch_linkedin_post",
        lambda url: {
            "url": url,
            "title": "Senior Backend Engineer",
            "company": "Acme",
            "location": "Remote",
            "description": LONG,
        },
    )
    text, source = resolve_job_post_text("https://linkedin.com/jobs/1", None)
    assert source == "scrape"
    assert text.startswith("Title: Senior Backend Engineer")
    assert "Company: Acme" in text


def test_empty_scrape_reads_as_an_auth_wall(monkeypatch):
    # Every selector missing produces a dict of empty strings rather than an
    # error, which used to reach the model as a blank job description.
    monkeypatch.setattr(
        job_post_source,
        "fetch_linkedin_post",
        lambda url: {"url": url, "title": "", "company": "", "location": "", "description": ""},
    )
    with pytest.raises(JobPostUnreadable) as excinfo:
        resolve_job_post_text("https://linkedin.com/jobs/1", None)
    assert "sign-in" in str(excinfo.value)


def test_no_url_and_no_text():
    with pytest.raises(JobPostUnreadable):
        resolve_job_post_text(None, None)


def test_normalize_collapses_whitespace_and_zero_widths():
    assert normalize("a​​  b\r\n\n\n\nc") == "a b\n\nc"
