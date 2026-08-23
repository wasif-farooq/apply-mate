"""Agent factories.

No agent has tools. They receive already-resolved text -- the job post and the
resume -- as prompt content. Nothing here fetches a URL or opens a file.

AssistantAgent is stateful: its model context persists across on_messages
calls, which is what makes the critic/revise loop cheap. That also means an
agent instance must never be shared between requests, so these are built fresh
per pipeline run. The model *client* is the shared singleton; agents are
throwaway objects.
"""
from __future__ import annotations

from autogen_agentchat.agents import AssistantAgent
from autogen_core.models import ChatCompletionClient
from pydantic import BaseModel

from core.config import get_settings
from services.agents import prompts
from services.agents.schemas import (
    CriticVerdict,
    EmailDraft,
    FitAnalysis,
    JobAnalysis,
    JobRelevance,
    RecipientChoice,
)

settings = get_settings()


def _make(
    name: str,
    client: ChatCompletionClient,
    system_message: str,
    schema: type[BaseModel],
) -> AssistantAgent:
    kwargs = {}
    if settings.AI_STRUCTURED_MODE == "json_schema":
        kwargs["output_content_type"] = schema
    return AssistantAgent(
        name=name,
        model_client=client,
        system_message=system_message + prompts.json_contract(schema),
        **kwargs,
    )


def job_analyst(client: ChatCompletionClient) -> AssistantAgent:
    return _make("JobAnalyst", client, prompts.JOB_ANALYST, JobAnalysis)


def fit_analyst(client: ChatCompletionClient) -> AssistantAgent:
    return _make("FitAnalyst", client, prompts.FIT_ANALYST, FitAnalysis)


def email_writer(client: ChatCompletionClient) -> AssistantAgent:
    return _make("EmailWriter", client, prompts.EMAIL_WRITER, EmailDraft)


def email_critic(client: ChatCompletionClient) -> AssistantAgent:
    return _make("EmailCritic", client, prompts.EMAIL_CRITIC, CriticVerdict)


def recipient_picker(client: ChatCompletionClient) -> AssistantAgent:
    return _make("RecipientPicker", client, prompts.RECIPIENT_PICKER, RecipientChoice)


def relevance_scorer(client: ChatCompletionClient) -> AssistantAgent:
    return _make("RelevanceScorer", client, prompts.RELEVANCE_SCORER, JobRelevance)
