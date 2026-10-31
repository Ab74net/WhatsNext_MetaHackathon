"""End-to-end API flow in mock mode: session -> upload -> extract -> delete."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_full_flow_in_mock_mode(jpeg_with_exif):
    health = client.get("/api/health").json()
    assert health["mock"] is True and "contributor" not in health["spark_model"]

    sid = client.post("/api/sessions").json()["session_id"]
    metas = client.post(f"/api/sessions/{sid}/photos",
                        files=[("files", ("a.jpg", jpeg_with_exif, "image/jpeg"))]).json()
    assert metas[0]["taken_at"] == "2023-12-25T09:30:00" and metas[0]["has_gps"] is True
    assert "gps" not in metas[0]  # coordinates never leave the server
    pid = metas[0]["photo_id"]

    photo = client.get(f"/api/sessions/{sid}/photos/{pid}.jpg")
    assert photo.status_code == 200 and b"Exif" not in photo.content[:4096]

    result = client.post(f"/api/sessions/{sid}/photos/{pid}/extract").json()
    assert result["skipped"] is False
    assert {i["category"] for i in result["items"]} == {"sofa", "lamp", "rug"}
    assert all(i["user_confirmed"] is False for i in result["items"])

    assert client.delete(f"/api/sessions/{sid}").json()["deleted"] is True
    assert client.get(f"/api/sessions/{sid}/photos/{pid}.jpg").status_code == 404


def test_review_edits_confirms_and_deletes_items(jpeg_with_exif):
    sid = client.post("/api/sessions").json()["session_id"]
    pid = client.post(f"/api/sessions/{sid}/photos",
                      files=[("files", ("a.jpg", jpeg_with_exif, "image/jpeg"))]).json()[0]["photo_id"]
    client.post(f"/api/sessions/{sid}/photos/{pid}/extract")
    client.post(f"/api/sessions/{sid}/photos/{pid}/extract")  # re-run must not duplicate
    items = client.get(f"/api/sessions/{sid}/items").json()
    assert len(items) == 3

    sofa = next(i for i in items if i["category"] == "sofa")
    edited = client.patch(f"/api/sessions/{sid}/items/{sofa['id']}",
                          json={"brand": "  IKEA ", "model": "", "user_confirmed": True}).json()
    assert edited["brand"] == "IKEA" and edited["model"] is None and edited["user_confirmed"] is True
    assert edited["evidence"] == sofa["evidence"]  # evidence can't be edited

    bad = client.patch(f"/api/sessions/{sid}/items/{sofa['id']}", json={"evidence": "seen_in_photo",
                                                                       "condition": "mint"})
    assert bad.status_code == 422

    assert client.delete(f"/api/sessions/{sid}/items/{sofa['id']}").json()["deleted"] is True
    assert len(client.get(f"/api/sessions/{sid}/items").json()) == 2


def test_rejects_non_photo_upload():
    sid = client.post("/api/sessions").json()["session_id"]
    r = client.post(f"/api/sessions/{sid}/photos", files=[("files", ("x.txt", b"hello", "text/plain"))])
    assert r.status_code == 415
