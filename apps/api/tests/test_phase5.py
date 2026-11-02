import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import alerts, content
from app.main import app
from app.memory_web import _Raw, _Room, _Suggestion, assemble, grade
from app.schemas import InventoryItem, PhotoEvidence

client = TestClient(app)


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    async def fake_fetch(lat, lon):
        return [], "2026-11-02T00:00:00+00:00", None
    monkeypatch.setattr(alerts, "fetch_live", fake_fetch)


def item(iid, category, dates=("2024-01-01",), brand=None):
    return InventoryItem(id=iid, category=category, brand=brand, model=None, condition="good", confidence=0.9,
                         evidence="seen_in_photo",
                         photos=[PhotoEvidence(photo_id=f"p{n}", taken_at=d, mask=None) for n, d in enumerate(dates)])


def test_evidence_grade_rules():
    assert grade(item("a", "tv", dates=("2024-01-01", "2025-01-01"))).grade == "strong"
    assert grade(item("b", "tv", brand="Samsung")).grade == "strong"
    assert grade(item("c", "tv")).grade == "fair"
    weak = grade(item("d", "tv", dates=(None,)))
    assert weak.grade == "weak" and not weak.has_receipt
    assert any("email" in t for t in weak.tips)


def test_assemble_trusts_the_inventory_not_the_model():
    items = [item("a", "sofa"), item("b", "lamp"), item("c", "rug")]
    raw = _Raw(
        rooms=[_Room(name="living room", item_ids=["a", "ghost", "a"]), _Room(name="Bedroom", item_ids=[])],
        suggestions=[
            _Suggestion(name="Sofa", room="Living room", related_item_ids=["a"], reason="dup", proof_hint="x"),
            _Suggestion(name="throw pillow", room="Living room", related_item_ids=["a", "ghost"], reason="r", proof_hint="p"),
            _Suggestion(name="throw pillow", room="Living room", related_item_ids=[], reason="again", proof_hint="p"),
            _Suggestion(name="side table", room="Attic", related_item_ids=["b"], reason="r", proof_hint="p"),
        ])
    web = assemble(raw, items)
    rooms = {r.id: r for r in web.rooms}
    assert rooms["living-room"].item_ids == ["a"]  # unknown and repeated ids dropped
    assert rooms["other"].item_ids == ["b", "c"]  # items the model left out still appear
    assert "bedroom" not in rooms  # empty rooms removed
    names = [s.name for s in web.suggestions]
    assert names == ["throw pillow", "side table"]  # owned item and duplicate removed
    assert web.suggestions[0].related_item_ids == ["a"]
    assert web.suggestions[1].room_id in rooms  # unknown room mapped to a real one
    assert set(web.grades) == {"a", "b", "c"}
    # Anything already found by the scan (even unconfirmed) is not suggested again.
    again = assemble(raw, items, known_categories={"Throw pillows"})
    assert [s.name for s in again.suggestions] == ["side table"]


def _jpeg():
    buf = io.BytesIO()
    Image.new("RGB", (400, 300), "white").save(buf, format="JPEG")
    return buf.getvalue()


def test_memory_web_uses_confirmed_items_only_and_add_from_photo():
    sid = client.post("/api/sessions").json()["session_id"]
    pid = client.post(f"/api/sessions/{sid}/photos", files=[("files", ("a.jpg", _jpeg(), "image/jpeg"))]).json()[0]["photo_id"]
    items = client.post(f"/api/sessions/{sid}/photos/{pid}/extract").json()["items"]
    assert client.post(f"/api/sessions/{sid}/memory-web").json()["rooms"] == []  # nothing confirmed yet

    sofa = next(i for i in items if i["category"] == "sofa")
    client.patch(f"/api/sessions/{sid}/items/{sofa['id']}", json={"user_confirmed": True})
    web = client.post(f"/api/sessions/{sid}/memory-web").json()
    assert web["rooms"][0]["item_ids"] == [sofa["id"]]
    assert web["suggestions"][0]["name"] == "throw pillow"

    other = io.BytesIO()
    Image.new("RGB", (400, 300), "gray").save(other, format="JPEG")
    added = client.post(f"/api/sessions/{sid}/items/from-photo", data={"category": "Lamp"},
                        files={"file": ("lamp.jpg", other.getvalue(), "image/jpeg")})
    assert added.status_code == 200
    body = added.json()
    assert body["item"]["category"] == "lamp" and body["item"]["user_confirmed"] is False
    assert body["item"]["photos"][0]["mask"] is not None

    # The mock finds no rug in any photo: nothing may be added without evidence.
    missing = client.post(f"/api/sessions/{sid}/items/from-photo", data={"category": "rug"},
                          files={"file": ("rug.jpg", _jpeg(), "image/jpeg")})
    assert missing.status_code == 422


def test_safety_flow_content_is_sourced_and_complete():
    card = content.safety_flow("wildfire", "smoke")
    source_ids = {s.id for s in card.sources}
    assert all(s.url.startswith("https://") for s in card.sources)
    for b in card.branches:
        assert b.steps, b.id
        assert all(step.source in source_ids for step in b.steps)
    trapped = next(b for b in card.branches if b.id == "trapped")
    assert trapped.emergency and "9-1-1" in trapped.steps[0].text
    returning = next(b for b in card.branches if b.id == "returning")
    assert returning.steps[-1].action == "start_claim"
    assert content.safety_flow("wildfire", "made-up").initial is None


def test_agent_offers_safety_flow():
    r = client.post("/api/agent", json={"messages": [{"role": "user", "text": "Is it safe to go back home?"}],
                                        "case": {"preset": "recovery"}}).json()
    flow = next(c for c in r["ui"] if c["type"] == "safety_flow")
    assert flow["initial"] == "returning"
