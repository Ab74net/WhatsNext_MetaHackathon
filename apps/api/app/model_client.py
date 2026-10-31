"""Muse Spark (identify) and SAM 3.1 (segment) calls, plus a mock for keyless testing.

API shape (dev.meta.ai/docs): OpenAI-compatible Responses API at MODEL_BASE_URL.
"""

import base64
import json
import logging

import meta_sam_parser as sam
from openai import AsyncOpenAI
from pydantic import ValidationError

from . import config
from .schemas import Mask, MaskBounds, PhotoIdentification

log = logging.getLogger(__name__)

IDENTIFY_PROMPT = """You help a disaster survivor rebuild a home-contents inventory for an insurance claim.
First classify the photo. If it shows an ID card, passport, document, receipt-like paper, or is a screenshot, set photo_kind accordingly and return an empty items list.
Otherwise list distinct household belongings worth claiming (furniture, electronics, appliances, decor, clothing, tools). Skip walls, floors, windows, people and pets.
Use a short lowercase noun for category (it is used as a segmentation prompt), e.g. "sofa", "television", "floor lamp".
Never guess a brand or model you cannot read; use null. Use evidence "inferred" only when the item is implied but not clearly visible. Be conservative: never inflate."""

_NULLABLE_STR = {"type": ["string", "null"]}
PHOTO_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["photo_kind", "items"],
    "properties": {
        "photo_kind": {"type": "string", "enum": ["room_or_belongings", "id_or_document", "screenshot", "other"]},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["category", "brand", "model", "condition", "confidence", "evidence"],
                "properties": {
                    "category": {"type": "string"},
                    "brand": _NULLABLE_STR,
                    "model": _NULLABLE_STR,
                    "condition": {"type": "string", "enum": ["good", "worn", "damaged", "unknown"]},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                    "evidence": {"type": "string", "enum": ["seen_in_photo", "inferred"]},
                },
            },
        },
    },
}


def _data_url(jpeg: bytes) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(jpeg).decode("ascii")


class ModelError(RuntimeError):
    pass


class MetaModelClient:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(base_url=config.MODEL_BASE_URL, api_key=config.MODEL_API_KEY)
        self.sam_image_mode: str | None = None  # "data_url" or "file_id", learned on first success

    async def identify(self, jpeg: bytes) -> PhotoIdentification:
        last_error = ""
        for _attempt in range(2):  # retry once on invalid output
            res = await self.client.responses.create(
                model=config.SPARK_MODEL,
                input=[{
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": IDENTIFY_PROMPT},
                        {"type": "input_image", "image_url": _data_url(jpeg)},
                    ],
                }],
                text={"format": {"type": "json_schema", "name": "photo_items",
                                 "schema": PHOTO_JSON_SCHEMA, "strict": True}},
            )
            try:
                return PhotoIdentification.model_validate(json.loads(res.output_text))
            except (json.JSONDecodeError, ValidationError) as err:
                last_error = str(err)[:300]
        raise ModelError(f"Spark returned invalid JSON twice: {last_error}")

    async def _segment_once(self, prompt: str, image_part: dict) -> list[Mask]:
        stream = await self.client.responses.create(
            model=config.SAM_MODEL,
            input=[{"type": "message", "role": "user",
                    "content": [{"type": "input_text", "text": prompt}, image_part]}],
            stream=True,
        )
        result = await sam.parse_responses_stream(stream, sam.image_segmentation_format()).final_result()
        return masks_from_records(result.records)

    async def segment(self, prompt: str, jpeg: bytes) -> list[Mask]:
        # The docs only show HTTPS image URLs for SAM; try inline base64 first, then
        # fall back to the Files API (uploaded file deleted right after use).
        if self.sam_image_mode != "file_id":
            try:
                masks = await self._segment_once(prompt, {"type": "input_image", "image_url": _data_url(jpeg)})
                self.sam_image_mode = "data_url"
                return masks
            except Exception as err:
                if self.sam_image_mode == "data_url":
                    raise
                log.warning("SAM rejected data URL (%s); trying Files API", type(err).__name__)
        uploaded = await self.client.files.create(file=("photo.jpg", jpeg, "image/jpeg"), purpose="user_data")
        try:
            masks = await self._segment_once(prompt, {"type": "input_image", "file_id": uploaded.id})
            self.sam_image_mode = "file_id"
            return masks
        finally:
            try:
                await self.client.files.delete(uploaded.id)
            except Exception:
                log.warning("could not delete uploaded file %s", uploaded.id)


def masks_from_records(records) -> list[Mask]:
    """Turn parsed SAM records into Masks (one per object), pairing box and mask by object id."""
    boxes = {r.object_id: r for r in records if r.kind == "box"}
    masks = {r.object_id: r for r in records if r.kind == "mask"}
    out = []
    for oid, box in boxes.items():
        m = masks.get(oid)
        out.append(Mask(
            bounds=MaskBounds(left=box.left, top=box.top, right=box.right, bottom=box.bottom),
            svg_path=sam.decode_mask_to_svg_path(m.mask) if m else None,
            confidence=box.confidence if box.confidence is not None else (m.confidence if m else None),
        ))
    return out


class MockModelClient:
    """Fake, deterministic results for testing the UI without an API key."""

    sam_image_mode = "mock"

    async def identify(self, jpeg: bytes) -> PhotoIdentification:
        return PhotoIdentification.model_validate({
            "photo_kind": "room_or_belongings",
            "items": [
                {"category": "sofa", "brand": None, "model": None, "condition": "good",
                 "confidence": 0.9, "evidence": "seen_in_photo"},
                {"category": "lamp", "brand": None, "model": None, "condition": "worn",
                 "confidence": 0.7, "evidence": "seen_in_photo"},
                {"category": "rug", "brand": None, "model": None, "condition": "unknown",
                 "confidence": 0.4, "evidence": "inferred"},
            ],
        })

    async def segment(self, prompt: str, jpeg: bytes) -> list[Mask]:
        from io import BytesIO

        from PIL import Image

        w, h = Image.open(BytesIO(jpeg)).size
        if prompt == "rug":
            return []  # an inferred item with no mask
        x0 = 0.1 if prompt == "sofa" else 0.6
        left, top, right, bottom = w * x0, h * 0.4, w * (x0 + 0.3), h * 0.8
        bw, bh = right - left, bottom - top
        path = f"M0 0L{bw:.0f} 0L{bw:.0f} {bh:.0f}L0 {bh:.0f}Z"
        return [Mask(bounds=MaskBounds(left=left, top=top, right=right, bottom=bottom),
                     svg_path=path, confidence=0.99)]


def make_client():
    return MockModelClient() if config.MOCK else MetaModelClient()
