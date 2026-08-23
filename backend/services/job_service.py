"""Orchestrates one job application.

Split three ways so the async boundary is explicit:

  prepare_apply       sync   DB reads + scraping (both blocking)
  generate_application async LLM only, no DB, no blocking I/O
  persist_application sync   DB writes

The route runs the sync halves in a threadpool and awaits the middle. That
matters for more than tidiness: linkedin_parser drives Playwright's sync API,
which raises if called from a thread with a running event loop.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from core.llm import ModelClients
from db.models import UserResume
from repositories.application_repo import ApplicationRepository
from repositories.resume_repo import ResumeRepository
from repositories.settings_repo import SettingsRepository
from repositories.user_repo import UserRepository
from core.errors import NoRecipientFound, ResumeTextUnavailable
from services.agents.pipeline import ApplyPipelineInput, run_apply_pipeline
from services.agents.schemas import ApplyPipelineResult
from services.email_service import EmailService
from services.job_post_source import PostSource, resolve_job_post_text
from utils.resume_handler import extract_text_from_pdf

logger = logging.getLogger("job-applier")


@dataclass
class ApplyContext:
    """Everything the LLM step needs, resolved. No paths, no URLs to fetch."""

    user_id: int
    linkedin_url: Optional[str]
    job_post_text: str
    post_source: PostSource
    resume_text: Optional[str]
    resume_id: Optional[int]
    to_email: Optional[str]
    candidate_name_hint: Optional[str]


class JobService:
    def __init__(
        self,
        user_repo: UserRepository,
        settings_repo: SettingsRepository,
        application_repo: ApplicationRepository = None,
        resume_repo: ResumeRepository = None,
    ):
        self.user_repo = user_repo
        self.settings_repo = settings_repo
        self.application_repo = application_repo
        self.resume_repo = resume_repo

    # ------------------------------------------------------------------ sync

    def resolve_resume(self, user_id: int, resume_id: Optional[int]) -> Optional[UserResume]:
        """Resolve a resume the caller is actually allowed to use.

        The client used to send a filesystem path that the server read without
        any ownership check, so any readable file could be emailed out. It now
        sends an id and the repository scopes the lookup to the user.
        """
        if not self.resume_repo:
            return None
        if resume_id is not None:
            return self.resume_repo.get_by_id(resume_id, user_id)
        return self.resume_repo.get_default(user_id)

    def resume_text_for(self, resume: Optional[UserResume]) -> Optional[str]:
        if resume is None:
            return None
        if resume.resume_text:
            return resume.resume_text
        # Uploaded before extraction moved to upload time. Backfill once.
        logger.info("[Resume] backfilling text for resume %s", resume.id)
        text = extract_text_from_pdf(resume.file_path)
        self.resume_repo.set_text(resume, text)
        return text

    def prepare_apply(
        self,
        user_id: int,
        linkedin_url: Optional[str],
        job_post_text: Optional[str],
        resume_id: Optional[int],
        to_email: Optional[str],
    ) -> ApplyContext:
        post_text, source = resolve_job_post_text(linkedin_url, job_post_text)

        resume = self.resolve_resume(user_id, resume_id)
        if resume_id is not None and resume is None:
            raise ResumeTextUnavailable("That resume does not exist.")

        resume_text = self.resume_text_for(resume)
        user = self.user_repo.get_by_id(user_id)

        return ApplyContext(
            user_id=user_id,
            linkedin_url=linkedin_url,
            job_post_text=post_text,
            post_source=source,
            resume_text=resume_text,
            resume_id=resume.id if resume else None,
            to_email=to_email,
            candidate_name_hint=user.name if user else None,
        )

    # ----------------------------------------------------------------- async

    async def generate_application(
        self, ctx: ApplyContext, clients: ModelClients
    ) -> ApplyPipelineResult:
        return await run_apply_pipeline(
            ApplyPipelineInput(
                job_post_text=ctx.job_post_text,
                resume_text=ctx.resume_text,
                job_post_url=ctx.linkedin_url,
                candidate_name_hint=ctx.candidate_name_hint,
            ),
            clients,
        )

    # ------------------------------------------------------------------ sync

    def persist_application(self, ctx: ApplyContext, result: ApplyPipelineResult) -> dict:
        recipient = result.recipient_email or ctx.to_email
        if not recipient:
            raise NoRecipientFound(
                "No email address found in the post. Provide a recipient address."
            )

        job = result.job
        fit = result.fit
        match_json = {
            "required_skills": job.required_skills,
            "seniority_level": job.seniority_level,
            "matching_skills": fit.matching_skills if fit else [],
            "skill_gaps": fit.skill_gaps if fit else [],
            "key_achievements": fit.key_achievements if fit else [],
            "unresolved_issues": result.unresolved_issues,
            "post_source": ctx.post_source,
        }
        total_exp = f"{fit.total_experience_years:g}" if fit else "0"

        application = None
        if self.application_repo:
            fields = dict(
                title=job.title,
                company=job.company,
                location=job.location,
                description=job.description,
                sent_to_email=recipient,
                subject=result.email.subject,
                body=result.email.body_html,
                total_experience_years=total_exp,
                match_json=match_json,
            )
            existing = (
                self.application_repo.get_by_url(ctx.user_id, ctx.linkedin_url)
                if ctx.linkedin_url
                else None
            )
            if existing and existing.status != "sent":
                application = self.application_repo.update_status(
                    existing.id, status="generated", **fields
                )
            else:
                # No prior application, or the last one was already sent and
                # this is a re-apply: either way, a new row.
                application = self.application_repo.create(
                    user_id=ctx.user_id,
                    linkedin_url=ctx.linkedin_url or "",
                    status="generated",
                    resume_path=None,
                    **fields,
                )

        payload = {
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "description": job.description[:500],
            "email": recipient,
            "subject": result.email.subject,
            "body": result.email.body_html,
            "status": "generated",
            "total_experience_years": total_exp,
            "resume_id": ctx.resume_id,
        }
        if application:
            payload["application_id"] = application.id
        return payload

    def send_job_email(
        self,
        user_id: int,
        to_email: str,
        subject: str,
        body: str,
        resume: Optional[UserResume] = None,
        application_id: int = None,
    ) -> dict:
        user = self.user_repo.get_by_id(user_id)

        if not user or not user.email_config or not user.email_config.get("type"):
            raise ValueError("Email not configured. Please configure email settings first.")

        email_service = EmailService(email_config=user.email_config)

        # The one place the PDF on disk is still needed: the MIME attachment.
        result = email_service.send(
            to_email=to_email,
            subject=subject,
            body=body,
            resume_path=resume.file_path if resume else None,
        )

        if self.application_repo and application_id:
            self.application_repo.update_status(
                application_id=application_id,
                status="sent",
                sent_to_email=to_email,
                subject=subject,
                body=body,
            )

        return result
