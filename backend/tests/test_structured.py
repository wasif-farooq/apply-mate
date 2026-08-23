import pytest
from autogen_agentchat.agents import AssistantAgent
from autogen_core import CancellationToken
from autogen_core.models import ModelFamily
from autogen_ext.models.replay import ReplayChatCompletionClient
from pydantic import BaseModel

from core.errors import LLMOutputInvalid
from services.agents.structured import _extract_json_block, run_structured


class Sample(BaseModel):
    name: str
    count: int


MODEL_INFO = {
    "vision": False,
    "function_calling": False,
    "json_output": True,
    "structured_output": False,
    "family": ModelFamily.UNKNOWN,
}


def _agent(*replies: str) -> AssistantAgent:
    return AssistantAgent(
        name="Test",
        model_client=ReplayChatCompletionClient(list(replies), model_info=MODEL_INFO),
        system_message="test",
    )


class TestExtractJsonBlock:
    def test_bare_json_passes_through(self):
        assert _extract_json_block('{"a": 1}') == '{"a": 1}'

    def test_strips_json_fence(self):
        assert _extract_json_block('```json\n{"a": 1}\n```') == '{"a": 1}'

    def test_strips_plain_fence(self):
        assert _extract_json_block('```\n{"a": 1}\n```') == '{"a": 1}'

    def test_drops_leading_prose(self):
        assert _extract_json_block('Sure, here it is:\n{"a": 1}') == '{"a": 1}'

    def test_survives_reasoning_preamble(self):
        raw = '<think>the user wants json</think>\n{"a": 1}'
        assert _extract_json_block(raw) == '{"a": 1}'

    def test_braces_inside_strings_do_not_end_the_object(self):
        raw = '{"body": "<p>a } brace</p>", "n": 2}'
        assert _extract_json_block(raw) == raw

    def test_escaped_quote_inside_string(self):
        raw = '{"body": "say \\"hi\\" }", "n": 2}'
        assert _extract_json_block(raw) == raw


class TestRunStructured:
    async def test_validates_clean_json(self):
        agent = _agent('{"name": "ada", "count": 3}')
        out = await run_structured(
            agent, "go", Sample, cancellation_token=CancellationToken()
        )
        assert out == Sample(name="ada", count=3)

    async def test_repairs_once_then_succeeds(self):
        agent = _agent('{"name": "ada"}', '{"name": "ada", "count": 7}')
        out = await run_structured(
            agent, "go", Sample, cancellation_token=CancellationToken()
        )
        assert out.count == 7

    async def test_raises_after_repairs_exhausted(self):
        agent = _agent("not json at all", "still not json")
        with pytest.raises(LLMOutputInvalid) as excinfo:
            await run_structured(
                agent, "go", Sample, cancellation_token=CancellationToken()
            )
        assert excinfo.value.schema == "Sample"

    async def test_no_repair_budget_fails_immediately(self):
        agent = _agent("nope")
        with pytest.raises(LLMOutputInvalid):
            await run_structured(
                agent,
                "go",
                Sample,
                cancellation_token=CancellationToken(),
                max_repairs=0,
            )
