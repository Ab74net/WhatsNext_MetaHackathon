"""Insurer-call prep: strict request schema, Spark output checks, static fallback."""

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app import config, toolkit
from app.main import app
from app.schemas import InsurerQuestionsRequest

api = TestClient(app)


def test_route_returns_base_list_in_mock_mode():
    r = api.post("/api/toolkit/insurer-questions", json={"hazard": "flood", "has_inventory": False})
    assert r.status_code == 200
    body = r.json()
    assert body["tailored"] is False
    assert [q["text"] for q in body["questions"]] == [q.text for q in toolkit.BASE_QUESTIONS]


@pytest.mark.parametrize("extra", [{"policy_number": "HO-123"}, {"name": "Jane"}, {"notes": "rep said"}])
def test_request_rejects_any_personal_field(extra):
    r = api.post("/api/toolkit/insurer-questions", json={"hazard": "flood", "has_inventory": True, **extra})
    assert r.status_code == 422


def test_request_rejects_unknown_hazard():
    with pytest.raises(ValidationError):
        InsurerQuestionsRequest(hazard="volcano", has_inventory=True)


def test_prompt_contains_only_hazard_inventory_and_base_list():
    prompt = toolkit.build_prompt(InsurerQuestionsRequest(hazard="flood", has_inventory=True))
    assert "flood" in prompt and "already have a list" in prompt
    for q in toolkit.BASE_QUESTIONS:
        assert q.text in prompt


def _good(n=7):
    return {"questions": [{"text": f"Question number {i}?", "why": "Write it down."} for i in range(n)]}


def test_check_accepts_valid_list():
    assert toolkit.check(_good()).tailored is True


@pytest.mark.parametrize("raw", [
    _good(3),  # dropped base questions
    _good(11),  # too many
    {"questions": [{"text": "Your policy covers hotels.", "why": "x"}] * 7},  # a statement, not a question
    {"questions": "nope"},
    {},
])
def test_check_rejects_bad_output(raw):
    with pytest.raises((ValueError, ValidationError)):
        toolkit.check(raw)


class _FakeSpark:
    """Stands in for the OpenAI client; returns queued outputs and records every call."""

    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = []
        self.client = SimpleNamespace(responses=SimpleNamespace(create=self._create))

    async def _create(self, **kwargs):
        self.calls.append(kwargs)
        out = self.outputs.pop(0)
        if isinstance(out, Exception):
            raise out
        return SimpleNamespace(output_text=out)


@pytest.fixture
def live(monkeypatch):
    monkeypatch.setattr(config, "MOCK", False)


async def _ask(fake):
    return await toolkit.insurer_questions(fake, InsurerQuestionsRequest(hazard="wildfire", has_inventory=False))


@pytest.mark.anyio
async def test_retries_once_then_uses_valid_output(live):
    fake = _FakeSpark(["not json", json.dumps(_good())])
    result = await _ask(fake)
    assert result.tailored and len(fake.calls) == 2
    assert fake.calls[0]["model"] == "muse-spark-1.3"  # standard model, never -contributor


@pytest.mark.anyio
async def test_falls_back_after_two_bad_outputs(live):
    fake = _FakeSpark([json.dumps(_good(2)), "{}"])
    result = await _ask(fake)
    assert result.tailored is False and len(fake.calls) == 2


@pytest.mark.anyio
async def test_falls_back_on_api_error_without_retry(live):
    fake = _FakeSpark([RuntimeError("network down")])
    result = await _ask(fake)
    assert result.tailored is False and len(fake.calls) == 1


@pytest.fixture
def anyio_backend():
    return "asyncio"
