import logging
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
        filename = f"resume_{current_user.id}_{timestamp}.pdf"
        filepath = UPLOAD_DIR / filename

        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)

        settings_repo = SettingsRepository(db)
        settings_repo.set_resume_path(current_user.id, str(filepath))

        logger.info(f"[API] Resume saved: {filepath}")
        return {
            "status": "uploaded",
            "path": str(filepath),
            "filename": filename
        }

    except Exception as e:
        logger.error(f"[API] Resume upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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

    if not current_user.refresh_token:
        logger.error(f"[API] No refresh token for user {current_user.id}")
        raise HTTPException(
            status_code=401,
            detail="Gmail not connected. Please log in again to authorize email sending."
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