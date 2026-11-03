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
from .schemas import Mask, MaskBounds, PhotoIdentification, PriceEstimate, SameItemDecision

log = logging.getLogger(__name__)

IDENTIFY_PROMPT = """You help a disaster survivor rebuild a home-contents inventory for an insurance claim.
First classify the photo. If it shows an ID card, passport, document, receipt-like paper, or is a screenshot, set photo_kind accordingly and return an empty items list.
If it is clearly not someone's home (a classroom, office, store, lobby, restaurant, street or other public or shared space), set photo_kind to "public_or_workplace" and return an empty items list: those things are not the user's belongings.
Otherwise list distinct household belongings worth claiming (furniture, electronics, appliances, decor, clothing, tools). Skip walls, floors, windows, people and pets.
This is a contents (personal property) inventory, so also skip built-in fixtures that are part of the building: toilets, sinks, vanities, bathtubs, cabinets, countertops, kitchen islands, built-in ovens, cooktops, range hoods, ceiling fans and fixed light fixtures.
Use a short lowercase noun for category (it is used as a segmentation prompt), e.g. "sofa", "television", "floor lamp".
Never guess a brand or model you cannot read; use null. Use evidence "inferred" only when the item is implied but not clearly visible. Be conservative: never inflate."""

_NULLABLE_STR = {"type": ["string", "null"]}
PHOTO_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["photo_kind", "items"],
    "properties": {
        "photo_kind": {"type": "string", "enum": ["room_or_belongings", "id_or_document", "screenshot",
                                                  "public_or_workplace", "other"]},
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


SAME_ITEM_PROMPT = """These {n} cropped photos each show a "{category}" from one person's home, taken at different times.
Group the crops that show the SAME individual physical object (the same specific {category}, not just the same kind).
Use colour, shape, pattern, wear, and surroundings. Two identical-looking items in different settings may still be different objects.
When unsure, keep crops in separate groups: wrongly merging items would remove a real belonging from an insurance claim.
Every crop number 1..{n} must appear in exactly one group. Keep each reason under 15 words."""

SAME_ITEM_SCHEMA = {
    "type": "object", "additionalProperties": False, "required": ["groups"],
    "properties": {"groups": {"type": "array", "items": {
        "type": "object", "additionalProperties": False, "required": ["images", "reason"],
        "properties": {"images": {"type": "array", "items": {"type": "integer"}}, "reason": {"type": "string"}},
    }}},
}

PRICE_PROMPT = """Estimate the cost to buy a NEW replacement for this household item in the United States today: {desc}.
If a photo of the item is attached, use it to identify the specific type and size (for example a mesh office chair, not a dining chair set). Price ONE item, not a set or bundle.
Search the web for one or two current listings of a comparable new item at a major US retailer, then give a low-high USD range.
Use at most two searches. Set source_url to the exact URL of one specific product page (not a search results or category page) that you actually saw in your search results, and source_title to its page title.
If you cannot find a real listing, set source_url to null. Never invent a URL or a price. Keep basis to one sentence."""

PRICE_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "required": ["low", "high", "source_url", "source_title", "basis"],
    "properties": {
        "low": {"type": "number"}, "high": {"type": "number"},
        "source_url": _NULLABLE_STR, "source_title": _NULLABLE_STR, "basis": {"type": "string"},
    },
}


def _norm_url(url: str) -> str:
    url = url.strip().lower().rstrip("/")
    for prefix in ("https://", "http://"):
        url = url.removeprefix(prefix)
    return url.removeprefix("www.")


def grounded_urls(response) -> set[str]:
    """Every URL the model actually saw: search results, opened pages and citations."""
    urls: set[str] = set()
    for item in response.output:
        d = item.model_dump()
        if d.get("type") == "web_search_call":
            urls.update(r.get("url") for r in d.get("results") or [] if r.get("url"))
            if (d.get("action") or {}).get("url"):
                urls.add(d["action"]["url"])
        elif d.get("type") == "message":
            for part in d.get("content") or []:
                urls.update(a.get("url") for a in part.get("annotations") or [] if a.get("url"))
    return {_norm_url(u) for u in urls}


def last_message_text(response) -> str:
    """With web search, output_text joins the model's progress notes and the answer;
    the structured answer is the final message."""
    for item in reversed(response.output):
        if item.type == "message":
            return "".join(getattr(p, "text", "") for p in item.content)
    return response.output_text


def _data_url(jpeg: bytes) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(jpeg).decode("ascii")


class ModelError(RuntimeError):
    pass


class MetaModelClient:
    def __init__(self) -> None:
        self.client = AsyncOpenAI(base_url=config.MODEL_BASE_URL, api_key=config.SPARK_API_KEY)
        self.sam_client = (self.client if config.SAM_API_KEY == config.SPARK_API_KEY else
                           AsyncOpenAI(base_url=config.MODEL_BASE_URL, api_key=config.SAM_API_KEY))
        self.wren_client = (self.client if config.WREN_API_KEY == config.SPARK_API_KEY else
                            AsyncOpenAI(base_url=config.MODEL_BASE_URL, api_key=config.WREN_API_KEY))
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
                reasoning={"effort": config.SPARK_IDENTIFY_EFFORT},
            )
            try:
                return PhotoIdentification.model_validate(json.loads(res.output_text))
            except (json.JSONDecodeError, ValidationError) as err:
                last_error = str(err)[:300]
        raise ModelError(f"Spark returned invalid JSON twice: {last_error}")

    async def _segment_once(self, prompt: str, image_part: dict) -> list[Mask]:
        stream = await self.sam_client.responses.create(
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
        uploaded = await self.sam_client.files.create(file=("photo.jpg", jpeg, "image/jpeg"), purpose="user_data")
        try:
            masks = await self._segment_once(prompt, {"type": "input_image", "file_id": uploaded.id})
            self.sam_image_mode = "file_id"
            return masks
        finally:
            try:
                await self.sam_client.files.delete(uploaded.id)
            except Exception:
                log.warning("could not delete uploaded file %s", uploaded.id)

    async def group_same_items(self, category: str, crops: list[tuple[bytes, str | None]]) -> SameItemDecision:
        content: list[dict] = [{"type": "input_text", "text": SAME_ITEM_PROMPT.format(n=len(crops), category=category)}]
        for i, (jpeg, taken_at) in enumerate(crops, start=1):
            content.append({"type": "input_text", "text": f"Crop {i}" + (f" (photo taken {taken_at[:10]})" if taken_at else "")})
            content.append({"type": "input_image", "image_url": _data_url(jpeg)})
        last_error = ""
        for _attempt in range(2):
            res = await self.client.responses.create(
                model=config.SPARK_MODEL,
                input=[{"role": "user", "content": content}],
                text={"format": {"type": "json_schema", "name": "same_items", "schema": SAME_ITEM_SCHEMA, "strict": True}},
                reasoning={"effort": config.SPARK_IDENTIFY_EFFORT},
            )
            try:
                raw = json.loads(res.output_text)
                # The model numbers crops from 1; convert to 0-based indices.
                for g in raw["groups"]:
                    g["images"] = [i - 1 for i in g["images"]]
                return SameItemDecision.model_validate(raw)
            except (json.JSONDecodeError, KeyError, TypeError, ValidationError) as err:
                last_error = str(err)[:300]
        raise ModelError(f"Spark returned invalid grouping twice: {last_error}")

    async def estimate_price(self, description: str, crop: bytes | None = None) -> tuple[PriceEstimate, bool]:
        """Returns the estimate and whether its source URL was really in the search results.
        The crop lets the model see what kind of item it is (an office chair, not a dining chair)."""
        content: list[dict] = [{"type": "input_text", "text": PRICE_PROMPT.format(desc=description)}]
        if crop:
            content.append({"type": "input_image", "image_url": _data_url(crop)})
        res = await self.client.responses.create(
            model=config.SPARK_MODEL,
            input=[{"role": "user", "content": content}],
            tools=[{"type": "web_search", "search_context_size": "low"}],
            include=["web_search_call.results"],
            text={"format": {"type": "json_schema", "name": "price", "schema": PRICE_SCHEMA, "strict": True}},
            reasoning={"effort": "low"},
        )
        try:
            estimate = PriceEstimate.model_validate(json.loads(last_message_text(res)))
        except (json.JSONDecodeError, ValidationError) as err:
            raise ModelError(f"Price lookup returned invalid JSON: {str(err)[:200]}") from err
        verified = bool(estimate.source_url) and _norm_url(estimate.source_url) in grounded_urls(res)
        return estimate, verified


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

    async def group_same_items(self, category: str, crops: list[tuple[bytes, str | None]]) -> SameItemDecision:
        # Mock: every crop of a category is the same object.
        return SameItemDecision.model_validate(
            {"groups": [{"images": list(range(len(crops))), "reason": "mock: same object"}]})

    async def estimate_price(self, description: str, crop: bytes | None = None) -> tuple[PriceEstimate, bool]:
        return PriceEstimate(low=100, high=200, source_url="https://example.com/mock-listing",
                             source_title="Mock listing", basis=f"mock price for {description}"), True


def make_client():
    return MockModelClient() if config.MOCK else MetaModelClient()
