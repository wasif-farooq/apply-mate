"""Typed contracts for each pipeline step.

Every field is required. The previous version gave everything a default,
which meant a total parse failure produced a valid-looking empty result and
the user got a blank email instead of an error.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Seniority = Literal[
    "entry", "mid", "senior", "lead", "staff", "principal", "executive", "unknown"
]


class JobAnalysis(BaseModel):
    title: str = Field(description="Job title only. No hashtags, no 'We are hiring' prefix.")
    company: str = Field(description="Hiring company name, or 'Not specified'.")
    location: str = Field(description="Work location, or 'Not specified'.")
    description: str = Field(description="The job description, cleaned of feed chrome.")
    required_skills: list[str] = Field(description="Specific skills the post asks for.")
    seniority_level: Seniority


class FitAnalysis(BaseModel):
    candidate_name: str = Field(description="Candidate's full name as written on the resume.")
    total_experience_years: float = Field(description="Total professional years, e.g. 6.5.")
    matching_skills: list[str] = Field(description="Resume skills that match required_skills.")
    skill_gaps: list[str] = Field(description="Required skills absent from the resume.")
    key_achievements: list[str] = Field(
        description="Quantified achievements from the resume, with their numbers."
    )


class EmailDraft(BaseModel):
    subject: str = Field(description="Max 60 characters.")
    body_html: str = Field(description="HTML body using <p> tags. No markdown, no emoji.")


class CriticVerdict(BaseModel):
    approved: bool
    issues: list[str] = Field(description="Specific, actionable problems. Empty when approved.")


class RecipientChoice(BaseModel):
    email: str | None = Field(description="The chosen address, or null if none is a real contact.")
    reason: str


class JobRelevance(BaseModel):
    """How well a scanned feed job matches the candidate."""

    score: int = Field(ge=0, le=100, description="0 = irrelevant, 100 = ideal match.")
    reason: str = Field(description="One sentence, naming the deciding factor.")


class ApplyPipelineResult(BaseModel):
    """What JobService gets back. Nothing here is scraped out of a transcript."""

    job: JobAnalysis
    fit: FitAnalysis | None
    email: EmailDraft
    recipient_email: str | None
    revisions_used: int
    unresolved_issues: list[str]
