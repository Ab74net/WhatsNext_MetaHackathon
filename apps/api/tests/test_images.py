import io

import pytest
from PIL import Image

from app.images import NotAnImageError, process_upload


def test_reads_exif_then_strips_it(jpeg_with_exif):
    p = process_upload(jpeg_with_exif)
    assert p.taken_at == "2023-12-25T09:30:00"  # DateTimeOriginal wins over DateTime
    assert p.gps == pytest.approx((38.8833, -77.0333), abs=1e-3)

    clean = Image.open(io.BytesIO(p.jpeg))
    assert len(clean.getexif()) == 0
    assert b"Exif" not in p.jpeg[:4096]


def test_downscales_large_photos():
    img = Image.new("RGB", (5000, 2500))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    p = process_upload(buf.getvalue())
    assert (p.width, p.height) == (2048, 1024)


def test_photo_without_exif():
    buf = io.BytesIO()
    Image.new("RGB", (10, 10)).save(buf, format="PNG")
    p = process_upload(buf.getvalue())
    assert p.taken_at is None and p.gps is None


def test_rejects_non_images():
    with pytest.raises(NotAnImageError):
        process_upload(b"not an image")
