import logging
import os
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from db.models import UserResume

logger = logging.getLogger("job-applier")


class ResumeRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: int,
        filename: str,
        file_path: str,
        resume_text: str,
        is_default: bool = False,
    ) -> UserResume:
        if is_default:
            self.clear_default_resumes(user_id)

        resume = UserResume(
            user_id=user_id,
            filename=filename,
            file_path=file_path,
            is_default=is_default,
            resume_text=resume_text,
            char_count=len(resume_text),
            extracted_at=datetime.now(timezone.utc),
        )
        self.db.add(resume)
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def get_by_user(
        self, user_id: int, limit: int | None = None, offset: int = 0
    ) -> List[UserResume]:
        query = self.db.query(UserResume).filter(
            UserResume.user_id == user_id
        ).order_by(UserResume.created_at.desc())
        if offset:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        return query.all()

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

    def set_text(self, resume: UserResume, resume_text: str) -> UserResume:
        """Backfill text for rows uploaded before extraction moved to upload."""
        resume.resume_text = resume_text
        resume.char_count = len(resume_text)
        resume.extracted_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(resume)
        return resume

    def delete(self, resume_id: int, user_id: int) -> bool:
        resume = self.get_by_id(resume_id, user_id)
        if not resume:
            return False

        file_path = resume.file_path
        self.db.delete(resume)
        self.db.commit()

        # Row first, file second: an orphaned file is recoverable, a row
        # pointing at a deleted file is not.
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                logger.warning("[Resume] could not unlink %s", file_path, exc_info=True)
        return True