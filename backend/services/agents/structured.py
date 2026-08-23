"""Get a validated Pydantic object out of one AssistantAgent turn.

This is the entire abstraction over the two structured-output modes, so no
call site has to know which one is active.
"""
from __future__ import annotations

import json
import logging
from typing import TypeVar, cast

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.messages import StructuredMessage, TextMessage
from autogen_core import CancellationToken
from openai import APIError
from pydantic import BaseModel, ValidationError

from core.config import get_settings
from core.llm import classify_openai_error
from core.errors import LLMOutputInvalid
from services.agents.prompts import REPAIR

logger = logging.getLogger("job-applier")
settings = get_settings()

T = TypeVar("T", bound=BaseModel)


def _extract_json_block(text: str) -> str:
    """Recover the JSON object from a response that may carry extra material.

    In json_object mode DashScope returns bare JSON, so this is usually a
    no-op. It exists for two real cases: a model that wraps output in ```json
    fences, and one that emits <think> reasoning before the payload.
    """
    text = text.strip()

    if "```" in text:
        fence = text.find("```")
        rest = text[fence + 3 :]
        if rest.lstrip().lower().startswith("json"):
            rest = rest.lstrip()[4:]
        close = rest.rfind("```")
        text = (rest[:close] if close != -1 else rest).strip()

    start = text.find("{")
    if start == -1:
        return text

    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return text[start:]


async def _turn(agent: AssistantAgent, prompt: str, ct: CancellationToken):
    try:
        return await agent.on_messages(
            [TextMessage(content=prompt, source="user")], ct
        )
    except APIError as exc:
        raise classify_openai_error(exc) from exc


async def run_structured(
    agent: AssistantAgent,
    prompt: str,
    schema: type[T],
    *,
    cancellation_token: CancellationToken,
    max_repairs: int = 1,
) -> T:
    response = await _turn(agent, prompt, cancellation_token)
    message = response.chat_message

    # json_schema mode: AutoGen already validated it for us.
    if isinstance(message, StructuredMessage):
        return cast(T, message.content)

    text = message.to_text()
    for attempt in range(max_repairs + 1):
        try:
            return schema.model_validate_json(_extract_json_block(text))
        except (ValidationError, json.JSONDecodeError, ValueError) as exc:
            if attempt == max_repairs:
                logger.error(
                    "[LLM] %s produced unusable output for %s: %s",
                    agent.name,
                    schema.__name__,
                    text[:500],
                )
                raise LLMOutputInvalid(
                    step=agent.name, schema=schema.__name__, raw=text[:500]
                ) from exc

            errors = exc.errors() if isinstance(exc, ValidationError) else str(exc)
            logger.warning("[LLM] %s output invalid, asking for a repair", agent.name)
            # Same agent instance: its context still holds the bad output, so
            # the model can see what it got wrong.
            response = await _turn(
                agent, REPAIR.format(errors=errors), cancellation_token
            )
            message = response.chat_message
            if isinstance(message, StructuredMessage):
                return cast(T, message.content)
            text = message.to_text()

    raise LLMOutputInvalid(step=agent.name, schema=schema.__name__)  # pragma: no cover
