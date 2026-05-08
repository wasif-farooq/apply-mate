import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from models import User
from repositories.application_repo import ApplicationRepository

logger = logging.getLogger("job-applier")

router = APIRouter(prefix="/api/applications", tags=["applications"])


class ApplicationResponse(BaseModel):
    id: int
    linkedin_url: str
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    status: str
    sent_to_email: Optional[str] = None
    subject: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class ApplicationListResponse(BaseModel):
    applications: list[ApplicationResponse]
    total: int
    page: int
    limit: int


class ApplicationStatsResponse(BaseModel):
    total: int
    sent: int
    generated: int
    failed: int


@router.get("", response_model=ApplicationListResponse)
def get_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    status: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Getting applications for user {current_user.id}")

    application_repo = ApplicationRepository(db)
    offset = (page - 1) * limit

    applications = application_repo.get_all_by_user(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        status=status
    )

    total = application_repo.count_by_user(current_user.id, status=status)

    return ApplicationListResponse(
        applications=[
            ApplicationResponse(
                id=app.id,
                linkedin_url=app.linkedin_url,
                title=app.title,
                company=app.company,
                location=app.location,
                status=app.status,
                sent_to_email=app.sent_to_email,
                subject=app.subject,
                error_message=app.error_message,
                created_at=app.created_at.isoformat(),
                updated_at=app.updated_at.isoformat()
            )
            for app in applications
        ],
        total=total,
        page=page,
        limit=limit
    )


@router.get("/stats", response_model=ApplicationStatsResponse)
def get_application_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Getting application stats for user {current_user.id}")

    application_repo = ApplicationRepository(db)
    stats = application_repo.get_stats(current_user.id)

    return ApplicationStatsResponse(**stats)


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Getting application {application_id} for user {current_user.id}")

    application_repo = ApplicationRepository(db)
    application = application_repo.get_by_id(application_id, current_user.id)

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    return ApplicationResponse(
        id=application.id,
        linkedin_url=application.linkedin_url,
        title=application.title,
        company=application.company,
        location=application.location,
        status=application.status,
        sent_to_email=application.sent_to_email,
        subject=application.subject,
        error_message=application.error_message,
        created_at=application.created_at.isoformat(),
        updated_at=application.updated_at.isoformat()
    )


@router.delete("/{application_id}")
def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(f"[API] Deleting application {application_id} for user {current_user.id}")

    application_repo = ApplicationRepository(db)
    deleted = application_repo.delete(application_id, current_user.id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Application not found")

    return {"status": "deleted", "application_id": application_id}