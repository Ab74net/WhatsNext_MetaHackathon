"""Document replacement order: data-file integrity, routes, and grounded answers."""

import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import config, documents
from app.main import app
from app.schemas import DocumentEntry, DocumentQuestion

api = TestClient(app)
VA = documents.guide("VA")
IDS = {d.id for d in VA.documents}
SIMPLE_FIELDS = {"official_url", "phone", "fees_note", "disaster_waiver_note", "needed_items"}


def test_virginia_has_8_to_10_documents_with_unique_ids():
    assert 8 <= len(VA.documents) <= 10
    assert len(IDS) == len(VA.documents)


def test_prerequisites_point_to_real_documents_and_have_no_cycle():
    for d in VA.documents:
        assert set(d.prerequisites) <= IDS - {d.id}, d.id
    assert documents.find_cycle(VA.documents) is None


def test_cycle_detection_finds_a_loop():
    def e(i, pre):
        return DocumentEntry(**{**VA.documents[0].model_dump(), "id": i, "prerequisites": pre})
    assert documents.find_cycle([e("a", ["b"]), e("b", ["c"]), e("c", ["a"])]) == ["a", "b", "c", "a"]
    assert documents.find_cycle([e("a", ["b"]), e("b", [])]) is None


def test_verified_entries_are_fully_sourced():
    for d in VA.documents:
        assert d.last_verified, d.id
        if d.verified:
            assert d.official_url.startswith("https://") and d.sources, d.id


def test_unverified_fields_are_left_empty():
    # Never ship a guess: a field named as unverified must be blank.
    for d in VA.documents:
        for f in set(d.unverified_fields) & SIMPLE_FIELDS:
            assert not getattr(d, f), f"{d.id}.{f} is unverified but filled in"


def test_states_route_marks_coming_soon():
    states = {s["state"]: s for s in api.get("/api/toolkit/documents").json()}
    assert states["VA"]["available"] and not states["WA"]["available"]
    assert api.get("/api/toolkit/documents/WA").status_code == 404
    assert api.get("/api/toolkit/documents/va").json()["state"] == "VA"


def test_ask_rejects_extra_fields():
    r = api.post("/api/toolkit/documents/ask", json={"state": "VA", "doc_ids": ["passport"], "question": "How?", "name": "Sam"})
    assert r.status_code == 422


def test_ask_in_mock_mode_says_to_call_the_agency():
    r = api.post("/api/toolkit/documents/ask", json={"state": "VA", "doc_ids": ["birth_certificate"], "question": "Can I pay cash?"})
    body = r.json()
    assert body["covered"] is False and "(804) 662-6200" in body["answer"]


def test_scrub_removes_numbers_and_emails():
    assert documents.scrub("my SSN 123-45-6789 and me@x.com") == "my SSN [removed] and [removed]"
    assert documents.scrub("What is form DS-11?") == "What is form DS-11?"


class _FakeSpark:
    def __init__(self, outputs):
        self.outputs, self.calls = list(outputs), []
        self.client = SimpleNamespace(responses=SimpleNamespace(create=self._create))

    async def _create(self, **kw):
        self.calls.append(kw)
        return SimpleNamespace(output_text=self.outputs.pop(0))


@pytest.mark.anyio
async def test_spark_sees_only_selected_entries_and_scrubbed_question(monkeypatch):
    monkeypatch.setattr(config, "MOCK", False)
    fake = _FakeSpark([json.dumps({"answer": "Use form DS-11.", "doc_ids": ["passport", "made_up"], "covered": True})])
    ans = await documents.ask(fake, DocumentQuestion(state="VA", doc_ids=["passport"], question="Call me at 555-123-4567?"))
    prompt = fake.calls[0]["input"]
    assert "Passport" in prompt and "Birth certificate" not in prompt
    assert "555-123-4567" not in prompt
    assert ans.doc_ids == ["passport"]  # ids not in the request are dropped


@pytest.fixture
def anyio_backend():
    return "asyncio"
