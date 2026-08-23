from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, case

from db.models import JobApplication


class ApplicationRepository:
    def __init__(self, db: Session):
        self.db = db

    # Fields a caller may set on create or update. Anything not listed is
    # managed by the repository (id, user_id, timestamps).
    WRITABLE = (
        "title",
        "company",
        "location",
        "description",
        "resume_path",
        "total_experience_years",
        "match_json",
        "sent_to_email",
        "subject",
        "body",
        "error_message",
        "status",
    )

    def create(self, user_id: int, linkedin_url: str, **fields) -> JobApplication:
        unknown = set(fields) - set(self.WRITABLE)
        if unknown:
            raise ValueError(f"Unknown JobApplication fields: {sorted(unknown)}")

        fields.setdefault("status", "generated")
        application = JobApplication(
            user_id=user_id,
            linkedin_url=linkedin_url,
            **fields,
        )
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)
        return application

    def update(self, application_id: int, **fields) -> Optional[JobApplication]:
        unknown = set(fields) - set(self.WRITABLE)
        if unknown:
            raise ValueError(f"Unknown JobApplication fields: {sorted(unknown)}")

        application = self.db.query(JobApplication).filter(
            JobApplication.id == application_id
        ).first()
        if not application:
            return None

        for key, value in fields.items():
            if value is not None:
                setattr(application, key, value)
        self.db.commit()
        self.db.refresh(application)
        return application

    def get_by_id(self, application_id: int, user_id: int = None) -> Optional[JobApplication]:
        query = self.db.query(JobApplication).filter(JobApplication.id == application_id)
        if user_id:
            query = query.filter(JobApplication.user_id == user_id)
        return query.first()

    def get_all_by_user(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        status: str = None
    ) -> List[JobApplication]:
        query = self.db.query(JobApplication).filter(JobApplication.user_id == user_id)
        if status:
            query = query.filter(JobApplication.status == status)
        return query.order_by(desc(JobApplication.created_at)).offset(offset).limit(limit).all()

    def count_by_user(self, user_id: int, status: str = None) -> int:
        query = self.db.query(JobApplication).filter(JobApplication.user_id == user_id)
        if status:
            query = query.filter(JobApplication.status == status)
        return query.count()

    def get_by_url(self, user_id: int, linkedin_url: str) -> Optional[JobApplication]:
        return self.db.query(JobApplication).filter(
            JobApplication.user_id == user_id,
            JobApplication.linkedin_url == linkedin_url
        ).first()

    def update_status(
        self,
        application_id: int,
        status: str,
        **fields,
    ) -> Optional[JobApplication]:
        return self.update(application_id, status=status, **fields)

    def delete(self, application_id: int, user_id: int) -> bool:
        application = self.db.query(JobApplication).filter(
            JobApplication.id == application_id,
            JobApplication.user_id == user_id
        ).first()
        if application:
            self.db.delete(application)
            self.db.commit()
            return True
        return False

    def get_stats(self, user_id: int) -> dict:
        result = self.db.query(
            func.count(JobApplication.id).label('total'),
            func.sum(case((JobApplication.status == 'sent', 1), else_=0)).label('sent'),
            func.sum(case((JobApplication.status == 'generated', 1), else_=0)).label('generated'),
            func.sum(case((JobApplication.status == 'failed', 1), else_=0)).label('failed')
        ).filter(JobApplication.user_id == user_id).first()
        
        return {
            "total": result.total or 0,
            "sent": result.sent or 0,
            "generated": result.generated or 0,
            "failed": result.failed or 0
        }