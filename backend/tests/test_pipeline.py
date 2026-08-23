"""End-to-end pipeline behaviour against a replayed model.

These pin the contract that used to be recovered by regex over a chat
transcript: each step returns a validated object, and the fields the writer
depends on actually arrive.
"""
import json

from autogen_core.models import ModelFamily
from autogen_ext.models.replay import ReplayChatCompletionClient

from core.llm import ModelClients
from services.agents.pipeline import ApplyPipelineInput, run_apply_pipeline

MODEL_INFO = {
    "vision": False,
    "function_calling": False,
    "json_output": True,
    "structured_output": False,
    "family": ModelFamily.UNKNOWN,
}

JOB = {
    "title": "Senior Backend Engineer",
    "company": "Acme",
    "location": "Remote",
    "description": "Build APIs in Python.",
    "required_skills": ["Python", "FastAPI", "Postgres"],
    "seniority_level": "senior",
}

FIT = {
    "candidate_name": "Ada Lovelace",
    "total_experience_years": 6.5,
    "matching_skills": ["Python", "Postgres"],
    "skill_gaps": ["FastAPI"],
    "key_achievements": ["Cut p95 latency by 40%"],
}

DRAFT = {"subject": "Senior Backend Engineer at Acme", "body_html": "<p>Dear Hiring Manager,</p>"}
DRAFT_2 = {"subject": "Backend Engineer at Acme", "body_html": "<p>Dear Hiring Manager,</p><p>Revised.</p>"}

APPROVED = {"approved": True, "issues": []}
REJECTED = {"approved": False, "issues": ["Too short", "No achievement"]}

POST = (
    "We are hiring a Senior Backend Engineer at Acme. Remote. "
    "You will build APIs in Python with FastAPI and Postgres. "
    "Send your CV to careers@acme.io to apply. We look forward to hearing from you "
    "and will respond within a week of receiving your application materials."
)

RESUME = "Ada Lovelace. 6.5 years. Python, Postgres. Cut p95 latency by 40%." * 5


def _clients(analytic: list, creative: list) -> ModelClients:
    return ModelClients(
        analytic=ReplayChatCompletionClient(
            [json.dumps(x) for x in analytic], model_info=MODEL_INFO
        ),
        creative=ReplayChatCompletionClient(
            [json.dumps(x) for x in creative], model_info=MODEL_INFO
        ),
    )


async def test_happy_path_approved_first_time():
    clients = _clients([JOB, FIT, APPROVED], [DRAFT])
    result = await run_apply_pipeline(
        ApplyPipelineInput(job_post_text=POST, resume_text=RESUME), clients
    )

    assert result.job.title == "Senior Backend Engineer"
    assert result.job.company == "Acme"
    # The old regex matched SKILLS: inside REQUIRED_SKILLS: and cross-fed the
    # job's requirements into the resume's skills.
    assert result.fit.matching_skills == ["Python", "Postgres"]
    assert result.fit.skill_gaps == ["FastAPI"]
    # ACHIEVEMENTS: was emitted by the agent and never parsed, so the writer
    # was told to include achievements it never received.
    assert result.fit.key_achievements == ["Cut p95 latency by 40%"]
    assert result.email.subject == DRAFT["subject"]
    assert result.revisions_used == 0
    assert result.unresolved_issues == []


async def test_single_candidate_email_needs_no_model_call():
    # analytic replay holds exactly job + fit + critique. If the recipient step
    # had called the model, the replay would run dry and this would error.
    clients = _clients([JOB, FIT, APPROVED], [DRAFT])
    result = await run_apply_pipeline(
        ApplyPipelineInput(job_post_text=POST, resume_text=RESUME), clients
    )
    assert result.recipient_email == "careers@acme.io"


async def test_critic_rejection_triggers_one_revision():
    clients = _clients([JOB, FIT, REJECTED, APPROVED], [DRAFT, DRAFT_2])
    result = await run_apply_pipeline(
        ApplyPipelineInput(job_post_text=POST, resume_text=RESUME), clients
    )
    assert result.revisions_used == 1
    assert result.email.body_html == DRAFT_2["body_html"]
    assert result.unresolved_issues == []


async def test_unapproved_draft_is_still_returned():
    # A merely imperfect email is deliverable; the user edits it before
    # sending. Failing here would turn a quality signal into an outage.
    # Two rejections use the full revision budget: critique -> revise twice,
    # so the creative client needs the initial draft plus two revisions.
    clients = _clients([JOB, FIT, REJECTED, REJECTED], [DRAFT, DRAFT_2, DRAFT_2])
    result = await run_apply_pipeline(
        ApplyPipelineInput(job_post_text=POST, resume_text=RESUME), clients
    )
    assert result.email is not None
    assert result.revisions_used == 2
    # The issues from the last critique. The final revision attempted to
    # address them but was not re-checked -- the budget ran out.
    assert result.unresolved_issues == REJECTED["issues"]


async def test_without_resume_the_fit_step_is_skipped():
    # Only job + critique on the analytic client: a fit call would run it dry.
    clients = _clients([JOB, APPROVED], [DRAFT])
    result = await run_apply_pipeline(
        ApplyPipelineInput(job_post_text=POST, resume_text=None), clients
    )
    assert result.fit is None
    assert result.email.subject == DRAFT["subject"]


async def test_recipient_is_none_when_post_has_no_address():
    post = POST.replace("Send your CV to careers@acme.io to apply.", "Apply on our site.")
    clients = _clients([JOB, FIT, APPROVED], [DRAFT])
    result = await run_apply_pipeline(
        ApplyPipelineInput(job_post_text=post, resume_text=RESUME), clients
    )
    assert result.recipient_email is None
