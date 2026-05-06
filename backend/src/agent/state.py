from typing import TypedDict, Optional
from dataclasses import dataclass, field


@dataclass
class JobState:
    linkedin_url: str = ""
    title: str = ""
    company: str = ""
    location: str = ""
    description: str = ""
    email: str = ""
    subject: str = ""
    body: str = ""
    resume_path: str = ""
    status: str = "pending"  # pending, fetching, extracting, generating, reviewing, sending, sent, failed
    error: str = ""
    needs_approval: bool = False
    approval: str = ""  # yes, no, retry


class AgentState(TypedDict):
    linkedin_url: str
    resume_path: str

    title: str
    company: str
    location: str
    description: str

    email: str
    subject: str
    body: str

    status: str
    error: str

    needs_approval: bool
    approval: str

    retry_count: int
    max_retries: int

    message: str


def create_initial_state(linkedin_url: str, resume_path: str = "./resume.pdf") -> AgentState:
    return {
        "linkedin_url": linkedin_url,
        "resume_path": resume_path,

        "title": "",
        "company": "",
        "location": "",
        "description": "",

        "email": "",
        "subject": "",
        "body": "",

        "status": "pending",
        "error": "",

        "needs_approval": False,
        "approval": "",

        "retry_count": 0,
        "max_retries": 3,

        "message": "",
    }