from typing import Optional
from dataclasses import dataclass


@dataclass
class JobData:
    url: str
    title: str = ""
    company: str = ""
    location: str = ""
    description: str = ""
    raw_html: str = ""


@dataclass
class ResumeData:
    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    summary: str = ""
    total_experience_years: str = "0"
    skills: list[str] = None
    education: list[dict] = None
    experience: list[dict] = None
    key_achievements: list[str] = None
    certifications: list[str] = None
    languages: list[str] = None

    def __post_init__(self):
        if self.skills is None:
            self.skills = []
        if self.education is None:
            self.education = []
        if self.experience is None:
            self.experience = []
        if self.key_achievements is None:
            self.key_achievements = []
        if self.certifications is None:
            self.certifications = []
        if self.languages is None:
            self.languages = []


@dataclass
class EmailContent:
    subject: str
    body: str
    email: Optional[str] = None


@dataclass
class JobApplication:
    job: JobData
    resume: Optional[ResumeData] = None
    candidate_name: str = ""
    email_content: Optional[EmailContent] = None
    status: str = "pending"
    error: Optional[str] = None


@dataclass
class LinkedInPost:
    title: str
    company: str
    location: str
    description: str
    url: str