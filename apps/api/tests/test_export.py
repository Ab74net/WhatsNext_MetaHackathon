"""Phase 3 API flow in mock mode: dedup -> merge -> value -> export."""

import io

from fastapi.testclient import TestClient
from openpyxl import load_workbook
from PIL import Image

from app.main import app

client = TestClient(app)


def _jpeg(color):
    buf = io.BytesIO()
    Image.new("RGB", (400, 300), color).save(buf, format="JPEG")
    return buf.getvalue()


def _setup():
    sid = client.post("/api/sessions").json()["session_id"]
    a, b = _jpeg("white"), _jpeg("gray")
    metas = client.post(f"/api/sessions/{sid}/photos", files=[
        ("files", ("a.jpg", a, "image/jpeg")), ("files", ("b.jpg", b, "image/jpeg")),
        ("files", ("a copy.jpg", a, "image/jpeg"))]).json()
    return sid, metas


def test_duplicate_upload_points_to_original():
    _, metas = _setup()
    assert metas[2]["duplicate_of"] == metas[0]["photo_id"] == metas[2]["photo_id"]
    assert metas[1]["duplicate_of"] is None


def test_merge_value_export_flow():
    sid, metas = _setup()
    for m in metas[:2]:
        client.post(f"/api/sessions/{sid}/photos/{m['photo_id']}/extract")
    assert len(client.get(f"/api/sessions/{sid}/items").json()) == 6  # sofa, lamp, rug x 2 photos

    merged = client.post(f"/api/sessions/{sid}/merge").json()
    # Mock says same-category crops match; rugs have no mask so they stay separate.
    assert len(merged["items"]) == 4 and len(merged["merges"]) == 2
    sofa = next(i for i in merged["items"] if i["category"] == "sofa")
    assert len(sofa["photos"]) == 2

    assert client.get(f"/api/sessions/{sid}/export.pdf").status_code == 409  # nothing confirmed yet

    valued = client.post(f"/api/sessions/{sid}/items/{sofa['id']}/value").json()
    assert valued["estimated_replacement_usd"]["source_url"].startswith("https://")
    client.patch(f"/api/sessions/{sid}/items/{sofa['id']}", json={"user_confirmed": True})

    xlsx = client.get(f"/api/sessions/{sid}/export.xlsx")
    assert xlsx.status_code == 200 and "claim-inventory-" in xlsx.headers["content-disposition"]
    ws = load_workbook(io.BytesIO(xlsx.content)).active
    rows = [r for r in ws.iter_rows(min_row=8, values_only=True) if r[2]]
    assert rows[0][2] == "Sofa" and rows[0][10] == 100  # only the confirmed item, with its estimate
    assert len(rows) == 2 and rows[1][2] == "Total (estimated)"

    pdf = client.get(f"/api/sessions/{sid}/export.pdf")
    assert pdf.content.startswith(b"%PDF") and b"Exif" not in pdf.content
    csv = client.get(f"/api/sessions/{sid}/export.csv").content.decode("utf-8-sig")
    assert csv.splitlines()[1].split(",")[1] == "Sofa"

    split = client.post(f"/api/sessions/{sid}/items/{sofa['id']}/split").json()
    assert len(split) == 2
