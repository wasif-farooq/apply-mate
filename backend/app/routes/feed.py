"""Endpoints the Chrome extension's feed scanner writes to.

The extension reads LinkedIn inside the user's own logged-in session, so what
arrives here is real post content rather than the auth-walled HTML the server
gets when it scrapes.
"""
# NOTE: deliberately no `from __future__ import annotations` here.
# slowapi's @limiter.limit wraps the endpoint with functools.wraps, so FastAPI
# resolves the (stringified) annotations against slowapi's module globals
# instead of ours -- the request model is not found and the body param silently
# degrades into a required query parameter.
import asyncio
import logging
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db, get_job_service
from app.exceptions import NotFoundError, UnprocessableEntityError
from core.limiter import limiter
from core.llm import get_model_clients
from models import User
from models.enums import ApplyMode, FeedJobStatus
from repositories.feed_repo import FeedRepository
from services.agents.pipeline import score_job_relevance
from services.job_service import JobService

logger = logging.getLogger("job-applier")

router = APIRouter(prefix="/api/feed", tags=["feed"])

MAX_POSTS_PER_SCAN = 100
MAX_SCORE_BATCH = 25


class ScannedPost(BaseModel):
    post_url: str
    post_type: Literal["job", "general", "ad", "unknown"] = "unknown"
    raw_content: Optional[str] = None
    author_name: Optional[str] = None
    author_url: Optional[str] = None


class SaveScanRequest(BaseModel):
    posts: list[ScannedPost] = Field(max_length=MAX_POSTS_PER_SCAN)


class SaveScanResponse(BaseModel):
    saved: int
    jobs_found: int
    duplicates_skipped: int


class ScanJob(BaseModel):
    url: str
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    description: str
    has_easy_apply: bool = False


class ScanRequest(BaseModel):
    jobs: list[ScanJob] = Field(max_length=MAX_SCORE_BATCH)
    resume_id: Optional[int] = None


class ScoredJob(BaseModel):
    id: int
    url: str
    title: Optional[str]
    company: Optional[str]
    location: Optional[str]
    has_easy_apply: bool
    ai_score: Optional[int]
    match_reason: Optional[str]
    status: str


class ScanResponse(BaseModel):
    scored: list[ScoredJob]
    skipped: int


class FeedJobsResponse(BaseModel):
    jobs: list[ScoredJob]
    total: int


class BatchApplyRequest(BaseModel):
    job_ids: list[int] = Field(max_length=MAX_SCORE_BATCH)
    apply_mode: Literal["email", "easy_apply"] = "email"
    resume_id: Optional[int] = None


class BatchApplyResult(BaseModel):
    job_id: int
    status: str
    application_id: Optional[int] = None
    error: Optional[str] = None


class BatchApplyResponse(BaseModel):
    results: list[BatchApplyResult]


def _to_scored(job) -> ScoredJob:
    return ScoredJob(
        id=job.id,
        url=job.linkedin_url,
        title=job.title,
        company=job.company,
        location=job.location,
        has_easy_apply=bool(job.has_easy_apply),
        ai_score=job.ai_score,
        match_reason=job.match_reason,
        status=job.status,
    )


@router.post("/save-scan", response_model=SaveScanResponse)
@limiter.limit("60/hour")
def save_scan(
    request: Request,
    body: SaveScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist everything the scanner saw, job or not.

    Non-job posts are stored too so the next scan can skip them by URL without
    reclassifying, which is what keeps repeat scans cheap.
    """
    feed_repo = FeedRepository(db)
    posts = [p.model_dump() for p in body.posts]

    saved = feed_repo.bulk_add_scans(current_user.id, posts)
    jobs_found = sum(1 for p in posts if p["post_type"] == "job")

    logger.info(
        "[Feed] user %s scanned %d posts: %d new, %d jobs",
        current_user.id,
        len(posts),
        saved,
        jobs_found,
    )
    return SaveScanResponse(
        saved=saved,
        jobs_found=jobs_found,
        duplicates_skipped=len(posts) - saved,
    )


@router.post("/scan", response_model=ScanResponse)
@limiter.limit("30/hour")
async def scan_jobs(
    request: Request,
    body: ScanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_service: JobService = Depends(get_job_service),
):
    """Score captured jobs against the user's resume."""
    resume = await run_in_threadpool(
        job_service.resolve_resume, current_user.id, body.resume_id
    )
    resume_text = await run_in_threadpool(job_service.resume_text_for, resume)
    if not resume_text:
        raise UnprocessableEntityError(
            "Upload a resume before scanning -- relevance is scored against it."
        )

    clients = get_model_clients()

    async def score(job: ScanJob):
        try:
            return job, await score_job_relevance(job.description, resume_text, clients)
        except Exception as exc:  # noqa: BLE001 - one bad job must not sink the batch
            logger.warning("[Feed] scoring failed for %s: %s", job.url, exc)
            return job, None

    outcomes = await asyncio.gather(*(score(j) for j in body.jobs))

    def persist():
        feed_repo = FeedRepository(db)
        scored, skipped = [], 0
        for job, relevance in outcomes:
            if relevance is None:
                skipped += 1
                continue
            row = feed_repo.upsert_job(
                current_user.id,
                job.url,
                title=job.title,
                company=job.company,
                location=job.location,
                description=job.description,
                has_easy_apply=job.has_easy_apply,
                ai_score=relevance.score,
                match_reason=relevance.reason,
                status=FeedJobStatus.SCORED.value,
            )
            scored.append(_to_scored(row))
        return scored, skipped

    scored, skipped = await run_in_threadpool(persist)
    return ScanResponse(scored=scored, skipped=skipped)


@router.get("/jobs", response_model=FeedJobsResponse)
def list_feed_jobs(
    status: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None, ge=0, le=100),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feed_repo = FeedRepository(db)
    jobs = feed_repo.list_jobs(
        current_user.id,
        status=status,
        min_score=min_score,
        limit=limit,
        offset=(page - 1) * limit,
    )
    return FeedJobsResponse(
        jobs=[_to_scored(j) for j in jobs],
        total=feed_repo.count_jobs(current_user.id, status=status),
    )


@router.post("/jobs/{job_id}/skip", response_model=ScoredJob)
def skip_feed_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feed_repo = FeedRepository(db)
    job = feed_repo.set_status(current_user.id, job_id, FeedJobStatus.SKIPPED.value)
    if not job:
        raise NotFoundError("Job not found")
    return _to_scored(job)


@router.post("/batch-apply", response_model=BatchApplyResponse)
@limiter.limit("10/hour")
async def batch_apply(
    request: Request,
    body: BatchApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_service: JobService = Depends(get_job_service),
):
    """Generate an application for each queued job.

    Sequential on purpose: the point of a batch here is convenience, not
    throughput, and firing N pipelines at once is the fastest way to trip the
    provider's rate limit for every other user of this deployment.
    """
    feed_repo = FeedRepository(db)
    clients = get_model_clients()
    results: list[BatchApplyResult] = []

    for job_id in body.job_ids:
        job = feed_repo.get_job(current_user.id, job_id)
        if not job:
            results.append(BatchApplyResult(job_id=job_id, status="not_found"))
            continue

        if body.apply_mode == ApplyMode.EASY_APPLY.value:
            # The extension drives LinkedIn's own form; the backend only
            # records the intent so the popup knows what to work through.
            feed_repo.set_status(
                current_user.id,
                job_id,
                FeedJobStatus.QUEUED.value,
                apply_mode=ApplyMode.EASY_APPLY.value,
            )
            results.append(BatchApplyResult(job_id=job_id, status="queued_easy_apply"))
            continue

        try:
            ctx = await run_in_threadpool(
                job_service.prepare_apply,
                current_user.id,
                job.linkedin_url,
                job.description,
                body.resume_id,
                None,
            )
            outcome = await job_service.generate_application(ctx, clients)
            payload = await run_in_threadpool(
                job_service.persist_application, ctx, outcome
            )
            application_id = payload.get("application_id")
            feed_repo.set_status(
                current_user.id,
                job_id,
                FeedJobStatus.APPLIED.value,
                apply_mode=ApplyMode.EMAIL.value,
                application_id=application_id,
            )
            results.append(
                BatchApplyResult(
                    job_id=job_id, status="generated", application_id=application_id
                )
            )
        except Exception as exc:  # noqa: BLE001 - one failure must not stop the batch
            logger.warning("[Feed] batch apply failed for job %s: %s", job_id, exc)
            feed_repo.set_status(current_user.id, job_id, FeedJobStatus.FAILED.value)
            results.append(
                BatchApplyResult(job_id=job_id, status="failed", error=str(exc))
            )

    return BatchApplyResponse(results=results)
