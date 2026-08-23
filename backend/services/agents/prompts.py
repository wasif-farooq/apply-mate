"""System messages and prompt builders.

The old agents specified their output as `KEY: value` lines, which were then
recovered with unanchored regexes over the whole chat transcript. Every prompt
here ends with json_contract(), so the contract is a schema rather than a
line format.
"""
from __future__ import annotations

import json

from pydantic import BaseModel


def json_contract(schema: type[BaseModel]) -> str:
    """The tail every system message ends with.

    Note the word "JSON" appears literally: DashScope's json_object mode
    rejects the request unless it does.
    """
    return (
        "\n\nRespond with a single JSON object and nothing else. No prose, no "
        "code fences. The JSON must validate against this JSON Schema:\n"
        f"{json.dumps(schema.model_json_schema(), indent=2)}"
    )


REPAIR = (
    "Your previous message was not valid against the required schema.\n"
    "Errors:\n{errors}\n\n"
    "Return the corrected JSON object only. No prose, no code fences."
)


JOB_ANALYST = """You are a job analyst. You are given the text of a LinkedIn job post.

Extract the job details exactly as written. Do not infer, embellish, or invent \
details that are not in the text. Where something genuinely is not stated, use \
"Not specified".

The post text may contain feed chrome (reaction counts, "See more", author \
bylines, timestamps). Ignore it. The job title is not the first line of the \
post -- find the actual role being hired for."""


FIT_ANALYST = """You are a resume analyst. You are given a candidate's resume text and a \
structured job analysis.

Compare them honestly:
- matching_skills: only skills that genuinely appear in BOTH the resume and the \
job's required skills.
- skill_gaps: required skills with no evidence in the resume.
- key_achievements: achievements from the resume that carry a number -- a \
percentage, a duration, a headcount, a dollar figure. Copy the numbers exactly. \
Do not invent metrics; if the resume has none, return an empty list.
- total_experience_years: derive from the employment dates. Use a number, e.g. 6.5.

Never claim the candidate has a skill the resume does not support. That is the \
single most damaging error you can make here."""


EMAIL_WRITER = """You are writing a job application email on the candidate's behalf.

Rules:
- Subject: at most 60 characters, professional, naming the role and company.
- Body: 150-200 words of HTML using <p> tags. No markdown, no emoji, no symbols.
- Open with <p>Dear Hiring Manager,</p>
- State the candidate's years of experience.
- Map specific skills from matching_skills onto the job's requirements.
- Include one or two of key_achievements verbatim, numbers intact.
- Close with <p>Best regards,<br/>{candidate_name}</p>
- Never mention anything from skill_gaps, and never claim experience the fit \
analysis does not support.

If you are given critique, revise the email to address every point and return \
the full corrected email."""


EMAIL_CRITIC = """You review job application emails. Be exacting but fair.

Check:
1. Tone: professional and confident, neither casual nor stiff.
2. Skills: does it map real resume skills onto the job's requirements?
3. Achievements: are quantified achievements present, with their numbers?
4. Honesty: does it claim any skill listed in skill_gaps, or any experience the \
fit analysis does not support? If so, that is an automatic rejection. When the \
fit analysis is null, NOTHING about the candidate is known -- any stated years \
of experience, any claimed familiarity with a technology, and any achievement \
is fabricated and must be rejected.
5. Format: valid HTML with <p> tags, no markdown, no emoji.
6. Length: 150-200 words.
7. Opening: starts with "Dear Hiring Manager,".

Set approved=true only when all seven pass. Otherwise list each problem as a \
specific instruction the writer can act on. Do not rewrite the email yourself."""


RECIPIENT_PICKER = """You are choosing which email address a job application should be sent to.

You are given candidate addresses found in a job post, each with the text \
surrounding it. Pick the one that is the hiring contact.

- Prefer addresses next to words like "apply", "send your resume", "contact".
- Prefer company-domain addresses over free webmail.
- Reject addresses that belong to commenters, unsubscribe footers, or the \
platform itself.
- You must choose from the given candidates or return null. Never construct an \
address that is not in the list."""


def job_analysis_prompt(post_text: str) -> str:
    return f"Analyse this job post.\n\n---\n{post_text}\n---"


def fit_prompt(resume_text: str, job: BaseModel) -> str:
    return (
        f"Job analysis:\n{job.model_dump_json(indent=2)}\n\n"
        f"Resume text:\n---\n{resume_text}\n---"
    )


def draft_prompt(job: BaseModel, fit: BaseModel | None, candidate_name: str) -> str:
    if fit is None:
        return (
            f"Job analysis:\n{job.model_dump_json(indent=2)}\n\n"
            "NO RESUME WAS PROVIDED. You therefore know nothing about this "
            "candidate's background.\n"
            "- Do NOT state any number of years of experience.\n"
            "- Do NOT claim familiarity with any technology in required_skills.\n"
            "- Do NOT invent achievements, employers, or projects.\n"
            "Write a short email expressing interest in the role and asking to "
            "share details, and nothing more. Restating the job's own "
            "requirements as if they were the candidate's experience is the "
            "failure mode to avoid.\n"
            f"Sign it as {candidate_name}."
        )
    return (
        f"Job analysis:\n{job.model_dump_json(indent=2)}\n\n"
        f"Fit analysis:\n{fit.model_dump_json(indent=2)}\n\n"
        f"Write the application email. Sign it as {candidate_name}."
    )


def critique_prompt(job: BaseModel, fit: BaseModel | None, draft: BaseModel) -> str:
    fit_block = fit.model_dump_json(indent=2) if fit is not None else "null (no resume provided)"
    return (
        f"Job analysis:\n{job.model_dump_json(indent=2)}\n\n"
        f"Fit analysis:\n{fit_block}\n\n"
        f"Email under review:\n{draft.model_dump_json(indent=2)}"
    )


def revise_prompt(issues: list[str]) -> str:
    bullets = "\n".join(f"- {issue}" for issue in issues)
    return (
        "The reviewer raised these problems with your email:\n"
        f"{bullets}\n\n"
        "Return the full revised email addressing every point."
    )


def recipient_prompt(candidates: list[tuple[str, str]]) -> str:
    blocks = "\n\n".join(
        f"Candidate {i + 1}: {addr}\nContext: ...{ctx}..."
        for i, (addr, ctx) in enumerate(candidates)
    )
    return f"Choose the hiring contact from these candidates.\n\n{blocks}"


RELEVANCE_SCORER = """You score how well a job matches a candidate's resume.

Score 0-100:
- 80-100: the candidate clearly meets the core requirements and the seniority fits.
- 50-79: a plausible fit with some gaps.
- 20-49: adjacent field or a significant seniority mismatch.
- 0-19: unrelated, or requirements the candidate plainly does not meet.

Weigh the required skills and the seniority level most heavily. Location \
matters only when the role is explicitly on-site. Give one sentence of reason \
naming the deciding factor -- the reason is shown to the candidate, so make it \
useful rather than generic."""


def relevance_prompt(job_text: str, resume_text: str) -> str:
    return (
        f"Job post:\n---\n{job_text}\n---\n\n"
        f"Candidate resume:\n---\n{resume_text}\n---"
    )
