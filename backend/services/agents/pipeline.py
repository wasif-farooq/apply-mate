"""The apply pipeline.

Replaces SelectorGroupChat + a hand-written selector function + a regex pass
over the chat transcript. The selector was already a fixed state machine, so
the group chat bought nothing but an extra failure surface; this is the same
flow written as what it always was -- a sequence of typed calls.

Inputs are text. Never a URL to fetch, never a path to read.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from autogen_core import CancellationToken

from core.config import get_settings
from core.llm import ModelClients
from services.agents import agents, prompts
from services.agents.retry import with_llm_retry
from services.agents.schemas import (
    ApplyPipelineResult,
    CriticVerdict,
    EmailDraft,
    FitAnalysis,
    JobAnalysis,
    JobRelevance,
    RecipientChoice,
)
from services.agents.structured import run_structured
from utils.email_extractor import find_email_candidates

logger = logging.getLogger("job-applier")
settings = get_settings()


@dataclass(frozen=True)
class ApplyPipelineInput:
    job_post_text: str
    resume_text: str | None
    job_post_url: str | None = None
    candidate_name_hint: str | None = None


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "\n[truncated]"


async def _resolve_recipient(
    post_text: str, clients: ModelClients, ct: CancellationToken
) -> str | None:
    """Pick the recipient address.

    Runs first, and usually without a model call at all. The old design spent
    a full agent turn on a regex and hung the run's termination condition off
    the literal token FINAL_EMAIL, which the agent was also told to emit
    mid-message -- so a run could stop before the address was produced.
    """
    candidates = find_email_candidates(post_text)
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0][0]

    picker = agents.recipient_picker(clients.analytic)
    choice: RecipientChoice = await with_llm_retry(
        lambda: run_structured(
            picker,
            prompts.recipient_prompt(candidates),
            RecipientChoice,
            cancellation_token=ct,
        ),
        step="recipient",
    )

    if not choice.email:
        return None
    # The model must choose from the list, not invent one.
    allowed = {addr.lower(): addr for addr, _ in candidates}
    return allowed.get(choice.email.strip().lower())


async def run_apply_pipeline(
    inp: ApplyPipelineInput,
    clients: ModelClients,
    ct: CancellationToken | None = None,
) -> ApplyPipelineResult:
    ct = ct or CancellationToken()
    post_text = _truncate(inp.job_post_text, settings.AI_MAX_POST_CHARS)
    resume_text = (
        _truncate(inp.resume_text, settings.AI_MAX_RESUME_CHARS)
        if inp.resume_text
        else None
    )

    started = time.monotonic()

    recipient = await _resolve_recipient(post_text, clients, ct)

    job: JobAnalysis = await with_llm_retry(
        lambda: run_structured(
            agents.job_analyst(clients.analytic),
            prompts.job_analysis_prompt(post_text),
            JobAnalysis,
            cancellation_token=ct,
        ),
        step="job_analysis",
    )
    logger.info("[Pipeline] job analysed: %s @ %s", job.title, job.company)

    fit: FitAnalysis | None = None
    if resume_text:
        fit = await with_llm_retry(
            lambda: run_structured(
                agents.fit_analyst(clients.analytic),
                prompts.fit_prompt(resume_text, job),
                FitAnalysis,
                cancellation_token=ct,
            ),
            step="fit_analysis",
        )
        logger.info(
            "[Pipeline] fit: %d matching, %d gaps, %d achievements",
            len(fit.matching_skills),
            len(fit.skill_gaps),
            len(fit.key_achievements),
        )

    candidate_name = (
        (fit.candidate_name if fit else None) or inp.candidate_name_hint or "Candidate"
    )

    # One writer instance for the whole loop: it keeps its own drafts in
    # context, so a revision turn only has to carry the critique.
    writer = agents.email_writer(clients.creative)
    draft: EmailDraft = await with_llm_retry(
        lambda: run_structured(
            writer,
            prompts.draft_prompt(job, fit, candidate_name),
            EmailDraft,
            cancellation_token=ct,
        ),
        step="draft",
    )

    revisions_used = 0
    unresolved: list[str] = []

    for _ in range(max(0, settings.AI_MAX_REVISIONS)):
        verdict: CriticVerdict = await with_llm_retry(
            lambda: run_structured(
                agents.email_critic(clients.analytic),
                prompts.critique_prompt(job, fit, draft),
                CriticVerdict,
                cancellation_token=ct,
            ),
            step="critique",
        )
        if verdict.approved:
            unresolved = []
            break

        unresolved = verdict.issues
        issues = verdict.issues
        draft = await with_llm_retry(
            lambda: run_structured(
                writer,
                prompts.revise_prompt(issues),
                EmailDraft,
                cancellation_token=ct,
            ),
            step="revise",
        )
        revisions_used += 1

    if unresolved:
        # A merely imperfect email is still deliverable and the user edits it
        # in the UI before sending. Failing here would turn a quality signal
        # into an outage.
        logger.info("[Pipeline] returning draft with %d unresolved issues", len(unresolved))

    logger.info(
        "[Pipeline] done in %.1fs (revisions=%d, recipient=%s)",
        time.monotonic() - started,
        revisions_used,
        recipient or "none",
    )

    return ApplyPipelineResult(
        job=job,
        fit=fit,
        email=draft,
        recipient_email=recipient,
        revisions_used=revisions_used,
        unresolved_issues=unresolved,
    )


async def score_job_relevance(
    job_text: str,
    resume_text: str,
    clients: ModelClients,
    ct: CancellationToken | None = None,
) -> JobRelevance:
    """One cheap call, used by the feed scanner to rank what it captured."""
    ct = ct or CancellationToken()
    return await with_llm_retry(
        lambda: run_structured(
            agents.relevance_scorer(clients.analytic),
            prompts.relevance_prompt(
                _truncate(job_text, settings.AI_MAX_POST_CHARS),
                _truncate(resume_text, settings.AI_MAX_RESUME_CHARS),
            ),
            JobRelevance,
            cancellation_token=ct,
        ),
        step="relevance",
    )
