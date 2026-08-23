from __future__ import annotations

from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from db.models import FeedJob, FeedScan


class FeedRepository:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------- scans

    def existing_post_urls(self, user_id: int, urls: list[str]) -> set[str]:
        """One query for the whole batch, so a 50-post scan is not 50 selects."""
        if not urls:
            return set()
        rows = (
            self.db.query(FeedScan.post_url)
            .filter(FeedScan.user_id == user_id, FeedScan.post_url.in_(urls))
            .all()
        )
        return {r[0] for r in rows}

    def bulk_add_scans(self, user_id: int, posts: list[dict]) -> int:
        """Insert the posts we have not seen. Returns how many were new."""
        urls = [p["post_url"] for p in posts if p.get("post_url")]
        seen = self.existing_post_urls(user_id, urls)

        added = 0
        batch_urls: set[str] = set()
        for post in posts:
            url = post.get("post_url")
            # Guard against duplicates inside the batch itself, not just
            # against what is already stored.
            if not url or url in seen or url in batch_urls:
                continue
            batch_urls.add(url)
            self.db.add(
                FeedScan(
                    user_id=user_id,
                    post_url=url,
                    post_type=post.get("post_type", "unknown"),
                    raw_content=post.get("raw_content"),
                    author_name=post.get("author_name"),
                    author_url=post.get("author_url"),
                )
            )
            added += 1

        self.db.commit()
        return added

    # -------------------------------------------------------------- jobs

    def get_job(self, user_id: int, job_id: int) -> Optional[FeedJob]:
        return (
            self.db.query(FeedJob)
            .filter(FeedJob.id == job_id, FeedJob.user_id == user_id)
            .first()
        )

    def get_job_by_url(self, user_id: int, url: str) -> Optional[FeedJob]:
        return (
            self.db.query(FeedJob)
            .filter(FeedJob.user_id == user_id, FeedJob.linkedin_url == url)
            .first()
        )

    def upsert_job(self, user_id: int, url: str, **fields) -> FeedJob:
        job = self.get_job_by_url(user_id, url)
        if job is None:
            job = FeedJob(user_id=user_id, linkedin_url=url, **fields)
            self.db.add(job)
        else:
            for key, value in fields.items():
                if value is not None:
                    setattr(job, key, value)
        self.db.commit()
        self.db.refresh(job)
        return job

    def list_jobs(
        self,
        user_id: int,
        status: str | None = None,
        min_score: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[FeedJob]:
        query = self.db.query(FeedJob).filter(FeedJob.user_id == user_id)
        if status:
            query = query.filter(FeedJob.status == status)
        if min_score is not None:
            query = query.filter(FeedJob.ai_score >= min_score)
        return (
            query.order_by(FeedJob.ai_score.desc().nullslast(), FeedJob.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_jobs(self, user_id: int, status: str | None = None) -> int:
        query = self.db.query(func.count(FeedJob.id)).filter(FeedJob.user_id == user_id)
        if status:
            query = query.filter(FeedJob.status == status)
        return query.scalar() or 0

    def set_status(self, user_id: int, job_id: int, status: str, **fields) -> Optional[FeedJob]:
        job = self.get_job(user_id, job_id)
        if not job:
            return None
        job.status = status
        for key, value in fields.items():
            if value is not None:
                setattr(job, key, value)
        self.db.commit()
        self.db.refresh(job)
        return job
