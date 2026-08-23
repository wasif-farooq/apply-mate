from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255))
    picture = Column(String(500))
    refresh_token = Column(String(500), nullable=True)
    email_config = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")
    resumes = relationship("UserResume", back_populates="user", cascade="all, delete-orphan")
    feed_scans = relationship("FeedScan", back_populates="user", cascade="all, delete-orphan")
    feed_jobs = relationship("FeedJob", back_populates="user", cascade="all, delete-orphan")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="settings")


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    linkedin_url = Column(String(500), nullable=False)
    title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="generated")  # generated, sent, failed
    sent_to_email = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=True)
    body = Column(Text, nullable=True)
    resume_path = Column(String(500), nullable=True)
    total_experience_years = Column(String(20), nullable=True)
    # {required_skills, seniority_level, matching_skills, skill_gaps,
    #  key_achievements, unresolved_issues} -- answers "why was it written
    #  this way?" without re-running the pipeline.
    match_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="applications")


class UserResume(Base):
    __tablename__ = "user_resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    is_default = Column(Boolean, default=False)
    # Extracted once at upload. This is what the model sees -- the PDF itself
    # is only opened again to attach it to the outgoing email.
    resume_text = Column(Text, nullable=True)
    char_count = Column(Integer, nullable=True)
    extracted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="resumes")


class FeedScan(Base):
    """Every post the extension saw, job or not.

    Non-job posts are kept so a rescan can skip them without re-classifying,
    which is the whole point of storing the boring ones.
    """

    __tablename__ = "feed_scans"
    __table_args__ = (
        UniqueConstraint("user_id", "post_url", name="uq_feed_scans_user_post"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_url = Column(String(1000), nullable=False)
    post_type = Column(String(20), nullable=False, default="unknown")
    raw_content = Column(Text, nullable=True)
    author_name = Column(String(255), nullable=True)
    author_url = Column(String(500), nullable=True)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="feed_scans")


class FeedJob(Base):
    """A post classified as a job, with its relevance score."""

    __tablename__ = "feed_jobs"
    __table_args__ = (
        UniqueConstraint("user_id", "linkedin_url", name="uq_feed_jobs_user_url"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    linkedin_url = Column(String(1000), nullable=False)
    title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    has_easy_apply = Column(Boolean, default=False)
    ai_score = Column(Integer, nullable=True)
    match_reason = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="new")
    apply_mode = Column(String(20), nullable=True)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="feed_jobs")
