import io
import os

import pytest

os.environ["MOCK"] = "1"  # tests never call the real API


@pytest.fixture
def jpeg_with_exif() -> bytes:
    from PIL import Image

    img = Image.new("RGB", (400, 300), "white")
    exif = Image.Exif()
    exif[0x0132] = "2024:05:01 10:00:00"
    exif.get_ifd(0x8769)[0x9003] = "2023:12:25 09:30:00"
    exif.get_ifd(0x8825).update({1: "N", 2: (38.0, 53.0, 0.0), 3: "W", 4: (77.0, 2.0, 0.0)})
    out = io.BytesIO()
    img.save(out, format="JPEG", exif=exif)
    return out.getvalue()
