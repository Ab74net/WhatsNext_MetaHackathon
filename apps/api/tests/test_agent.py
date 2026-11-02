import pytest
from fastapi.testclient import TestClient

from app import alerts, content
from app.agent import is_emergency
from app.assistance import build_plan
from app.main import app
from app.schemas import CaseFile

client = TestClient(app)


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    async def fake_fetch(lat, lon):
        return [], "2026-11-02T00:00:00+00:00", None
    monkeypatch.setattr(alerts, "fetch_live", fake_fetch)


@pytest.mark.parametrize("text", ["My son is hurt", "I can't breathe", "we're trapped in the house",
                                  "the fire is coming toward us", "smoke is inside the house", "she's bleeding"])
def test_emergencies_are_caught(text):
    assert is_emergency(text)


@pytest.mark.parametrize("text", ["My home burned down last month", "The fire destroyed my house",
                                  "Where can I stay tonight?", "How do I start an insurance claim?"])
def test_ordinary_requests_are_not_emergencies(text):
    assert not is_emergency(text)


def _ids(items):
    return {i.program_id for i in items}


def test_recovery_plan_for_destroyed_home_includes_grants():
    plan = build_plan(CaseFile(preset="recovery", home_damage="destroyed", insured="yes"))
    assert {"wa-household-needs-grant", "karen-worthy-grant", "insurance-claim"} <= _ids(plan.today)
    assert {"fema-ia", "sba-loans"} <= _ids(plan.deadlines)
    assert all(i.status != "available" for i in plan.deadlines if i.program_id == "fema-ia")


def test_rules_exclude_what_the_case_file_rules_out():
    plan = build_plan(CaseFile(preset="recovery", home_damage="minor", insured="no"))
    all_ids = _ids(plan.today) | _ids(plan.this_week) | _ids(plan.deadlines)
    assert "karen-worthy-grant" not in all_ids  # needs a destroyed home
    assert "insurance-claim" not in all_ids and "oic-hotline" not in all_ids


def test_response_phase_plan_is_about_safety_and_shelter():
    plan = build_plan(CaseFile(preset="during"))
    assert "red-cross" in _ids(plan.today)
    assert "wa-household-needs-grant" not in _ids(plan.today)  # not launched during the fires


def test_every_fact_has_a_source():
    for r in content.resources("response") + content.resources("recovery"):
        assert r.source_url.startswith("https://") and r.checked_at
        assert 47.4 < r.lat < 47.9 and -117.7 < r.lon < -117.1  # Spokane area
    for p in content.programs()["programs"]:
        assert p["source_url"].startswith("https://")
        assert not (p.get("deadline") or {}).get("date"), "deadlines must come from a published source"
    for a in content.recorded_alerts():
        assert a.source_url.startswith("https://") and a.recorded
    assert {a.name for a in content.fire_areas()} == {"Old Trails Fire", "Fairview Fire", "Autumn Lane Fire"}


def test_agent_returns_cards_in_mock_mode():
    r = client.post("/api/agent", json={"messages": [{"role": "user", "text":
        "My house burned in the Old Trails fire. What should I do first? Where can we stay tonight?"}]}).json()
    types = [c["type"] for c in r["ui"]]
    assert types[:3] == ["alerts", "plan", "resources"]
    assert r["case"]["home_damage"] == "destroyed"
    alerts_card = r["ui"][0]
    assert alerts_card["recorded"] and alerts_card["fire_areas"]


def test_agent_stops_at_911_for_emergencies():
    r = client.post("/api/agent", json={"messages": [{"role": "user", "text": "my dad is hurt and can't breathe"}]}).json()
    assert [c["type"] for c in r["ui"]] == ["emergency"] and "911" in r["message"]
    assert r["tools_used"] == []


def test_scenario_endpoint_has_presets_and_perimeters():
    s = client.get("/api/scenario").json()
    assert [p["id"] for p in s["presets"]] == ["during", "recovery"]
    assert len(s["fire_areas"]["features"]) == 3


def test_lost_documents_offers_the_toolkit():
    from fastapi.testclient import TestClient
    from app.main import app
    r = TestClient(app).post("/api/agent", json={"messages": [{"role": "user", "text": "I lost my license and passport in the fire"}]})
    cards = [c for c in r.json()["ui"] if c["type"] == "toolkit_link"]
    assert cards and cards[0]["tab"] == "documents"
