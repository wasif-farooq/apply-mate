from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from src.db.models import JobApplication


class ApplicationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: int,
        linkedin_url: str,
        title: str = None,
        company: str = None,
        location: str = None,
        description: str = None,
        resume_path: str = None,
        total_experience_years: str = None,
        status: str = "generated"
    ) -> JobApplication:
        application = JobApplication(
            user_id=user_id,
            linkedin_url=linkedin_url,
            title=title,
            company=company,
            location=location,
            description=description,
            resume_path=resume_path,
            total_experience_years=total_experience_years,
            status=status
        )
        self.db.add(application)
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
        sent_to_email: str = None,
        subject: str = None,
        body: str = None,
        error_message: str = None
    ) -> Optional[JobApplication]:
        application = self.db.query(JobApplication).filter(JobApplication.id == application_id).first()
        if application:
            application.status = status
            if sent_to_email is not None:
                application.sent_to_email = sent_to_email
            if subject is not None:
                application.subject = subject
            if body is not None:
                application.body = body
            if error_message is not None:
                application.error_message = error_message
            self.db.commit()
            self.db.refresh(application)
        return application

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
        total = self.count_by_user(user_id)
        sent = self.count_by_user(user_id, status="sent")
        generated = self.count_by_user(user_id, status="generated")
        failed = self.count_by_user(user_id, status="failed")
        
        return {
            "total": total,
            "sent": sent,
            "generated": generated,
            "failed": failed
        }