from typing import List, Optional
from sqlalchemy.orm import Session
from src.db.models import UserResume


class ResumeRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: int, filename: str, file_path: str, is_default: bool = False) -> UserResume:
        if is_default:
            self.clear_default_resumes(user_id)
        
        resume = UserResume(
            user_id=user_id,
            filename=filename,
            file_path=file_path,
            is_default=is_default
        )
        self.db.add(resume)
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def get_by_user(self, user_id: int) -> List[UserResume]:
        return self.db.query(UserResume).filter(
            UserResume.user_id == user_id
        ).order_by(UserResume.created_at.desc()).all()

    def get_by_id(self, resume_id: int, user_id: int) -> Optional[UserResume]:
        return self.db.query(UserResume).filter(
            UserResume.id == resume_id,
            UserResume.user_id == user_id
        ).first()

    def get_default(self, user_id: int) -> Optional[UserResume]:
        return self.db.query(UserResume).filter(
            UserResume.user_id == user_id,
            UserResume.is_default == True
        ).first()

    def set_default(self, resume_id: int, user_id: int) -> Optional[UserResume]:
        self.clear_default_resumes(user_id)
        
        resume = self.get_by_id(resume_id, user_id)
        if resume:
            resume.is_default = True
            self.db.commit()
            self.db.refresh(resume)
        return resume

    def clear_default_resumes(self, user_id: int):
        self.db.query(UserResume).filter(
            UserResume.user_id == user_id,
            UserResume.is_default == True
        ).update({"is_default": False})

    def delete(self, resume_id: int, user_id: int) -> bool:
        resume = self.get_by_id(resume_id, user_id)
        if resume:
            self.db.delete(resume)
            self.db.commit()
            return True
        return False