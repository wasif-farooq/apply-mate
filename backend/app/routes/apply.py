import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, field_validator, model_validator
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db, get_job_service
from app.exceptions import NotFoundError, UnprocessableEntityError
from core.limiter import limiter
from core.llm import get_model_clients
from models import User
from repositories.resume_repo import ResumeRepository
from core.errors import ResumeTextUnavailable
from services.job_service import JobService
from utils.resume_handler import extract_text_from_pdf

logger = logging.getLogger("job-applier")

router = APIRouter(prefix="/api", tags=["apply"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class ApplyRequest(BaseModel):
    # Either supply the post text (the extension reads it from the logged-in
    # DOM) or a URL for the server to scrape. Text wins when both are present.
    linkedin_url: Optional[str] = None
    job_post_text: Optional[str] = None
    resume_id: Optional[int] = None
    to_email: Optional[str] = None

    @field_validator("linkedin_url")
    @classmethod
    def validate_linkedin_url(cls, v):
        if v is None:
            return v
        if not v.startswith(("http://", "https://")):
            raise ValueError("LinkedIn URL must start with http:// or https://")
        if "linkedin.com" not in v.lower():
            raise ValueError("Invalid LinkedIn URL")
        return v

    @field_validator("to_email")
    @classmethod
    def validate_email(cls, v):
        if v and "@" not in v:
            raise ValueError("Invalid email address")
        return v

    @model_validator(mode="after")
    def require_a_source(self):
        if not self.linkedin_url and not (self.job_post_text or "").strip():
            raise ValueError("Provide either linkedin_url or job_post_text")
        return self


class ApplyResponse(BaseModel):
    title: str
    company: str
    location: str
    description: str
    email: str
    subject: str
    body: str
    status: str
    total_experience_years: Optional[str] = None
    application_id: Optional[int] = None
    resume_id: Optional[int] = None


class SendRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    resume_id: Optional[int] = None
    application_id: Optional[int] = None


class ResumeResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    is_default: bool
    created_at: datetime
    file_size: Optional[int] = None
    char_count: Optional[int] = None


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(f"[API] Uploading resume: {file.filename}")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    # A uuid suffix, not just a timestamp: two uploads in the same second by
    # the same user used to overwrite each other.
    stored_filename = (
        f"resume_{current_user.id}_"
        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.pdf"
    )
    filepath = UPLOAD_DIR / stored_filename

    with open(filepath, "wb") as f:
        f.write(content)

    # Extract now, once. Everything downstream reads the stored text, so a PDF
    # we cannot read is rejected here rather than silently producing a
    # resume-less application later.
    try:
        resume_text = await run_in_threadpool(extract_text_from_pdf, str(filepath))
    except ResumeTextUnavailable as exc:
        filepath.unlink(missing_ok=True)
        raise UnprocessableEntityError(str(exc)) from exc

    resume_repo = ResumeRepository(db)
    is_default = len(resume_repo.get_by_user(current_user.id)) == 0

    resume = resume_repo.create(
        user_id=current_user.id,
        filename=file.filename,
        file_path=str(filepath),
        resume_text=resume_text,
        is_default=is_default,
    )

    logger.info(
        "[API] Resume %s stored, %d chars extracted", resume.id, len(resume_text)
    )

    return {
        "status": "success",
        "path": str(filepath),
        "filename": file.filename,
        "resume_id": resume.id,
        "char_count": len(resume_text),
    }


@router.get("/resumes", response_model=list[ResumeResponse])
def get_resumes(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume_repo = ResumeRepository(db)
    resumes = resume_repo.get_by_user(current_user.id, limit=limit, offset=(page - 1) * limit)

    result = []
    for r in resumes:
        file_size = 0
        if r.file_path and os.path.exists(r.file_path):
            try:
                file_size = os.path.getsize(r.file_path)
            except OSError:
                file_size = 0
        result.append(
            ResumeResponse(
                id=r.id,
                filename=r.filename,
                file_path=r.file_path,
                is_default=r.is_default,
                created_at=r.created_at,
                file_size=file_size,
                char_count=r.char_count,
            )
        )
    return result


@router.post("/resumes/{resume_id}/set-default", response_model=ResumeResponse)
def set_default_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume_repo = ResumeRepository(db)
    resume = resume_repo.set_default(resume_id, current_user.id)
    if not resume:
        raise NotFoundError("Resume not found")

    return ResumeResponse(
        id=resume.id,
        filename=resume.filename,
        file_path=resume.file_path,
        is_default=resume.is_default,
        created_at=resume.created_at,
        char_count=resume.char_count,
    )


@router.delete("/resumes/{resume_id}")
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume_repo = ResumeRepository(db)
    if not resume_repo.delete(resume_id, current_user.id):
        raise NotFoundError("Resume not found")
    return {"status": "deleted", "resume_id": resume_id}


@router.post("/apply", response_model=ApplyResponse)
@limiter.limit("20/hour")
async def apply_to_job(
    request: Request,
    apply_request: ApplyRequest,
    current_user: User = Depends(get_current_user),
    job_service: JobService = Depends(get_job_service),
):
    logger.info(
        "[API] Apply: url=%s text=%s",
        apply_request.linkedin_url,
        f"{len(apply_request.job_post_text)} chars" if apply_request.job_post_text else "none",
    )

    # prepare/persist stay off the event loop: both hit a sync Session, and
    # prepare may drive Playwright's sync API, which refuses to run in a
    # thread that has a running loop.
    ctx = await run_in_threadpool(
        job_service.prepare_apply,
        current_user.id,
        apply_request.linkedin_url,
        apply_request.job_post_text,
        apply_request.resume_id,
        apply_request.to_email,
    )

    result = await job_service.generate_application(ctx, get_model_clients())

    payload = await run_in_threadpool(job_service.persist_application, ctx, result)
    return ApplyResponse(**payload)


@router.post("/send")
@limiter.limit("20/hour")
def send_job_email(
    request: Request,
    send_request: SendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    job_service: JobService = Depends(get_job_service),
):
    logger.info(f"[API] Sending email to: {send_request.to_email}")

    resume = job_service.resolve_resume(current_user.id, send_request.resume_id)
    if send_request.resume_id is not None and resume is None:
        raise NotFoundError("Resume not found")

    try:
        result = job_service.send_job_email(
            user_id=current_user.id,
            to_email=send_request.to_email,
            subject=send_request.subject,
            body=send_request.body,
            resume=resume,
            application_id=send_request.application_id,
        )
        logger.info(f"[API] Email sent successfully to {send_request.to_email}")
        return result
    except ValueError as exc:
        raise UnprocessableEntityError(str(exc)) from exc
    except Exception:
        logger.exception("[API] Failed to send email")
        if send_request.application_id:
            job_service.application_repo.update_status(
                send_request.application_id,
                status="failed",
                error_message="Email sending failed",
            )
        raise
