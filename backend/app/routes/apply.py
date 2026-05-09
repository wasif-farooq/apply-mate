import logging
import os
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from models import User
from repositories.user_repo import UserRepository
from repositories.settings_repo import SettingsRepository
from repositories.provider_repo import ProviderRepository
from repositories.application_repo import ApplicationRepository
from repositories.resume_repo import ResumeRepository
from services.job_service import JobService

logger = logging.getLogger("job-applier")

router = APIRouter(prefix="/api", tags=["apply"])

UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


class ApplyRequest(BaseModel):
    linkedin_url: str
    resume_path: str = "./resume.pdf"
    to_email: str = None
    provider: str = None
    model: str = None
    api_key: str = None
    application_id: int = None


class ApplyResponse(BaseModel):
    title: str
    company: str
    location: str
    description: str
    email: str
    subject: str
    body: str
    status: str
    total_experience_years: str = None
    application_id: int = None


class SendRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    resume_path: str = "./resume.pdf"
    application_id: int = None


@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Uploading resume: {file.filename}")

    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        stored_filename = f"resume_{current_user.id}_{timestamp}.pdf"
        filepath = UPLOAD_DIR / stored_filename

        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)

        resume_repo = ResumeRepository(db)
        
        existing_resumes = resume_repo.get_by_user(current_user.id)
        is_default = len(existing_resumes) == 0
        
        resume = resume_repo.create(
            user_id=current_user.id,
            filename=file.filename,
            file_path=str(filepath),
            is_default=is_default
        )

        logger.info(f"[API] Resume saved: {filepath}")
        return {
            "status": "uploaded",
            "path": str(filepath),
            "filename": file.filename,
            "resume_id": resume.id
        }

    except Exception as e:
        logger.error(f"[API] Resume upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class ResumeResponse(BaseModel):
    id: int
    filename: str
    file_path: str
    is_default: bool
    created_at: datetime
    file_size: int = 0


@router.get("/resumes", response_model=list[ResumeResponse])
def get_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Getting resumes for user: {current_user.id}")
    
    resume_repo = ResumeRepository(db)
    resumes = resume_repo.get_by_user(current_user.id)
    
    result = []
    for r in resumes:
        file_size = 0
        if os.path.exists(r.file_path):
            try:
                file_size = os.path.getsize(r.file_path)
            except Exception:
                file_size = 0
        result.append(ResumeResponse(
            id=r.id,
            filename=r.filename,
            file_path=r.file_path,
            is_default=r.is_default,
            created_at=r.created_at,
            file_size=file_size
        ))
    return result


@router.post("/resumes", response_model=ResumeResponse)
async def upload_resume_new(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Uploading new resume: {file.filename}")

    try:
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        stored_filename = f"resume_{current_user.id}_{timestamp}.pdf"
        filepath = UPLOAD_DIR / stored_filename

        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)

        resume_repo = ResumeRepository(db)
        
        existing_resumes = resume_repo.get_by_user(current_user.id)
        is_default = len(existing_resumes) == 0
        
        resume = resume_repo.create(
            user_id=current_user.id,
            filename=file.filename,
            file_path=str(filepath),
            is_default=is_default
        )

        logger.info(f"[API] Resume created: {resume.id}")
        
        return ResumeResponse(
            id=resume.id,
            filename=resume.filename,
            file_path=resume.file_path,
            is_default=resume.is_default,
            created_at=resume.created_at
        )

    except Exception as e:
        logger.error(f"[API] Resume upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resumes/{resume_id}/set-default", response_model=ResumeResponse)
def set_default_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Setting default resume: {resume_id}")

    resume_repo = ResumeRepository(db)
    resume = resume_repo.set_default(resume_id, current_user.id)

    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    return ResumeResponse(
        id=resume.id,
        filename=resume.filename,
        file_path=resume.file_path,
        is_default=resume.is_default,
        created_at=resume.created_at
    )


@router.delete("/resumes/{resume_id}")
def delete_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Deleting resume: {resume_id}")

    resume_repo = ResumeRepository(db)
    success = resume_repo.delete(resume_id, current_user.id)

    if not success:
        raise HTTPException(status_code=404, detail="Resume not found")

    return {"status": "deleted"}


@router.post("/apply", response_model=ApplyResponse)
def apply_to_job(
    request: ApplyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Applying to job: {request.linkedin_url}")

    user_repo = UserRepository(db)
    settings_repo = SettingsRepository(db)
    provider_repo = ProviderRepository(db)
    application_repo = ApplicationRepository(db)

    job_service = JobService(
        user_repo=user_repo,
        settings_repo=settings_repo,
        provider_repo=provider_repo,
        application_repo=application_repo
    )

    try:
        resume_path = request.resume_path
        if not resume_path:
            resume_path = settings_repo.get_resume_path(current_user.id)

        result = job_service.apply_to_job(
            user_id=current_user.id,
            linkedin_url=request.linkedin_url,
            resume_path=resume_path if resume_path and Path(resume_path).exists() else None,
            to_email=request.to_email,
            provider=request.provider,
            model=request.model,
            api_key=request.api_key
        )

        return ApplyResponse(**result)

    except ValueError as e:
        logger.error(f"[API] Apply validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[API] Apply failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send")
def send_job_email(
    request: SendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Sending email to: {request.to_email}")

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(current_user.id)

    if not user.email_config or not user.email_config.get("type"):
        logger.error(f"[API] No email config for user {current_user.id}")
        raise HTTPException(
            status_code=401,
            detail="Email not configured. Please configure email settings first."
        )

    user_repo = UserRepository(db)
    settings_repo = SettingsRepository(db)
    provider_repo = ProviderRepository(db)
    application_repo = ApplicationRepository(db)

    job_service = JobService(
        user_repo=user_repo,
        settings_repo=settings_repo,
        provider_repo=provider_repo,
        application_repo=application_repo
    )

    try:
        result = job_service.send_job_email(
            user_id=current_user.id,
            to_email=request.to_email,
            subject=request.subject,
            body=request.body,
            resume_path=request.resume_path,
            application_id=request.application_id
        )
        logger.info(f"[API] Email sent successfully to {request.to_email}")
        return result
    except Exception as e:
        logger.error(f"[API] Failed to send email: {e}")
        
        # Update application status to failed if application_id provided
        if request.application_id:
            application_repo.update_status(
                request.application_id,
                status="failed",
                error_message=str(e)
            )
        
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")