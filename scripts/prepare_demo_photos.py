"""Build metadata-free samples from six supplied hackathon test photos; no downloads or models.

The selected originals were visually reviewed for faces/personal information. A detail crop
of living-room.webp explicitly demonstrates merging two views of the same supplied image.
Originals and saved model diagnostics remain ignored. Only sanitized fixtures are shipped.
"""
from pathlib import Path
import json
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts/test_photos"
OUTPUT = ROOT / "apps/web/public/demo/photos"
FIXTURES = ROOT / "apps/web/src/lib/demo/fixtures"
# source, public id, room, matching row of the saved lexicographic model run
PHOTOS = [
    ("13.jpg", "living-room", "Living room", 4),
    ("18.jpg", "living-mirror", "Living room", 9),
    ("3.jpg", "kitchen", "Kitchen", 13),
    ("1.jpg", "dishwasher", "Kitchen", 0),
    ("11.jpg", "bedroom", "Bedroom", 2),
    ("16.png", "pillows", "Bedroom", 7),
]

def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    FIXTURES.mkdir(parents=True, exist_ok=True)
    runs = sorted((ROOT / "scripts/out").glob("day1_results*.json"))
    if not runs:
        raise SystemExit("The saved scan run is required; do not call a model to rebuild demo fixtures.")
    rows = json.loads(runs[0].read_text(encoding="utf-8"))["results"]
    photos = []
    for filename, name, room, row_index in PHOTOS:
        original = ImageOps.exif_transpose(Image.open(SOURCE / filename)).convert("RGB")
        original.thumbnail((1024, 1024))
        original.save(OUTPUT / f"{name}.webp", quality=84, method=6, exif=b"", xmp=b"")
        thumb = ImageOps.contain(original, (360, 280))
        thumb.save(OUTPUT / f"{name}-thumb.webp", quality=78, method=6, exif=b"", xmp=b"")
        width, height = original.size
        source_width, source_height = Image.open(SOURCE / filename).size
        row = rows[row_index]
        items = []
        # The cached run segmented at most three categories per photo. Reuse those boxes.
        for entry in row["sam"]:
            category = entry["prompt"]
            identified = next((i for i in row["identify"]["data"]["items"] if i["category"] == category), None)
            if not identified or not entry.get("boxes"):
                continue
            box = entry["boxes"][0]
            bounds = {key: round(box[short] * scale) for key, short, scale in [
                ("left", "l", width/source_width), ("top", "t", height/source_height),
                ("right", "r", width/source_width), ("bottom", "b", height/source_height)]}
            item = {**identified, "id": f"{name}-{category.replace(' ', '-')}", "photos": [{"photo_id": name, "taken_at": None,
                "mask": {"bounds": bounds, "svg_path": None, "confidence": None}}], "estimated_replacement_usd": None, "user_confirmed": False}
            items.append(item)
        photos.append({"id": name, "room": room, "src": f"/demo/photos/{name}.webp", "thumbnail": f"/demo/photos/{name}-thumb.webp",
            "alt": f"Supplied {room.lower()} sample showing {', '.join(i['category'] for i in items)}", "width": width, "height": height,
            "provenance": "Supplied hackathon test asset; cached detections, no fresh inference", "items": items})
    # A transparently labeled second view of one photo, not independent ownership evidence.
    living = Image.open(OUTPUT / "living-room.webp")
    crop_bounds = (0, 140, living.width, living.height)
    detail = living.crop(crop_bounds)
    detail.save(OUTPUT / "living-detail.webp", quality=84, method=6, exif=b"", xmp=b"")
    detail_item = json.loads(json.dumps(next(i for i in photos[0]["items"] if i["category"] == "coffee table")))
    detail_item["id"] = "living-detail-coffee-table"
    detail_item["photos"][0]["photo_id"] = "living-detail"
    bounds = detail_item["photos"][0]["mask"]["bounds"]
    bounds["top"] = max(0, bounds["top"] - 140)
    bounds["bottom"] = min(detail.height, bounds["bottom"] - 140)
    photos.append({"id": "living-detail", "room": "Living room", "src": "/demo/photos/living-detail.webp", "thumbnail": "/demo/photos/living-detail.webp",
        "alt": "Detail crop of the same supplied coffee-table image, for a simulated duplicate match", "width": detail.width, "height": detail.height,
        "provenance": "Derived crop of living-room; not an independent photograph", "items": [detail_item]})
    for file in OUTPUT.glob("*.webp"):
        image = Image.open(file)
        assert not image.getexif() and not image.info.get("exif") and not image.info.get("xmp"), file
    (FIXTURES / "photos.json").write_text(json.dumps(photos, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(PHOTOS)} distinct supplied originals, one labeled detail crop, and cached bounding boxes.")

if __name__ == "__main__":
    main()
