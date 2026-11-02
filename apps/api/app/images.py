"""Photo decoding, EXIF reading, and EXIF-free re-encoding.

Privacy: EXIF is read once into memory, then every photo is re-encoded as a JPEG with
no metadata. Only that clean JPEG is sent to models or back to the browser.
Never log image bytes or EXIF values.
"""

import io
from dataclasses import dataclass
from datetime import datetime

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

from .config import MAX_IMAGE_SIDE

register_heif_opener()  # lets Pillow open iPhone HEIC photos

EXIF_IFD = 0x8769
GPS_IFD = 0x8825
DATETIME_ORIGINAL = 0x9003
DATETIME = 0x0132


@dataclass
class ProcessedPhoto:
    jpeg: bytes  # EXIF-free, orientation applied, downscaled
    width: int
    height: int
    taken_at: str | None
    gps: tuple[float, float] | None


def _parse_exif_datetime(value) -> str | None:
    try:
        return datetime.strptime(str(value).strip("\x00 "), "%Y:%m:%d %H:%M:%S").isoformat()
    except (ValueError, TypeError):
        return None


def _gps_to_decimal(gps: dict) -> tuple[float, float] | None:
    try:
        def deg(values, ref):
            d, m, s = (float(v) for v in values)
            sign = -1 if ref in ("S", "W") else 1
            return sign * (d + m / 60 + s / 3600)

        return deg(gps[2], gps[1]), deg(gps[4], gps[3])
    except (KeyError, TypeError, ValueError, ZeroDivisionError):
        return None


class NotAnImageError(ValueError):
    pass


def process_upload(data: bytes) -> ProcessedPhoto:
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as err:
        raise NotAnImageError("Could not read this file as a photo") from err

    exif = img.getexif()
    sub = exif.get_ifd(EXIF_IFD)
    taken_at = _parse_exif_datetime(sub.get(DATETIME_ORIGINAL) or exif.get(DATETIME))
    gps = _gps_to_decimal(exif.get_ifd(GPS_IFD))

    img = ImageOps.exif_transpose(img)  # bake in rotation before EXIF is dropped
    img = img.convert("RGB")
    img.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))

    out = io.BytesIO()
    img.save(out, format="JPEG", quality=88)  # no exif= argument, so no metadata is written
    return ProcessedPhoto(out.getvalue(), img.width, img.height, taken_at, gps)


def crop_jpeg(jpeg: bytes, bounds, pad: float = 0.15, max_side: int = 512) -> bytes:
    """Crop an (already EXIF-free) photo to a mask's bounds plus padding."""
    img = Image.open(io.BytesIO(jpeg))
    w, h = bounds.right - bounds.left, bounds.bottom - bounds.top
    p = max(w, h) * pad
    box = (max(0, int(bounds.left - p)), max(0, int(bounds.top - p)),
           min(img.width, int(bounds.right + p)), min(img.height, int(bounds.bottom + p)))
    crop = img.crop(box)
    crop.thumbnail((max_side, max_side))
    out = io.BytesIO()
    crop.save(out, format="JPEG", quality=85)
    return out.getvalue()
