"""Per-photo extraction: Spark identifies items, SAM 3.1 finds their masks.

Cross-photo merging, valuation and export come in Phase 3.
"""

import asyncio
import logging
import time

from . import config
from .schemas import IdentifiedItem, InventoryItem, Mask, PhotoEvidence, PhotoResult
from .sessions import Session

log = logging.getLogger(__name__)
_limit = asyncio.Semaphore(config.MAX_PARALLEL_MODEL_CALLS)
EXTRA_INSTANCE_MIN_CONFIDENCE = 0.5


async def _limited(coro):
    async with _limit:
        return await coro


def build_items(photo_id: str, taken_at: str | None, identified: list[IdentifiedItem],
                masks_by_category: dict[str, list[Mask]]) -> list[InventoryItem]:
    """Pair Spark's items with SAM's instances of the same category, in confidence order.

    SAM may find more instances than Spark listed (four chairs, one "chair" item);
    confident extras become their own items with no brand. Spark items without a
    mask are kept, unmasked. Every item still needs user confirmation.
    """
    items: list[InventoryItem] = []
    by_category: dict[str, list[IdentifiedItem]] = {}
    for it in identified:
        by_category.setdefault(it.category.strip().lower(), []).append(it)

    for category, spark_items in by_category.items():
        masks = sorted(masks_by_category.get(category, []), key=lambda m: -(m.confidence or 0))
        for i in range(max(len(spark_items), len(masks))):
            mask = masks[i] if i < len(masks) else None
            if i < len(spark_items):
                base = spark_items[i]
            elif (mask.confidence or 0) >= EXTRA_INSTANCE_MIN_CONFIDENCE:
                base = IdentifiedItem(category=category, brand=None, model=None, condition="unknown",
                                      confidence=min(spark_items[0].confidence, mask.confidence or 0),
                                      evidence="seen_in_photo")
            else:
                continue
            items.append(InventoryItem(
                id=f"{photo_id}_{len(items) + 1}",
                category=category,
                brand=base.brand,
                model=base.model,
                condition=base.condition,
                confidence=base.confidence,
                evidence=base.evidence,
                photos=[PhotoEvidence(photo_id=photo_id, taken_at=taken_at, mask=mask)],
            ))
    return items


async def process_photo(client, session: Session, photo_id: str) -> PhotoResult:
    stored = session.photos[photo_id]
    photo = stored.photo
    timings: dict[str, int] = {}
    warnings: list[str] = []

    t0 = time.perf_counter()
    ident = await _limited(client.identify(photo.jpeg))
    timings["identify"] = int((time.perf_counter() - t0) * 1000)

    if ident.photo_kind != "room_or_belongings":
        return PhotoResult(photo_id=photo_id, photo_kind=ident.photo_kind, skipped=True,
                           items=[], timings_ms=timings)

    categories = list(dict.fromkeys(i.category.strip().lower() for i in ident.items))
    to_segment = categories[: config.SAM_PROMPTS_PER_PHOTO]
    if len(categories) > len(to_segment):
        warnings.append(f"Masks skipped for {len(categories) - len(to_segment)} item types (per-photo limit)")

    t0 = time.perf_counter()
    results = await asyncio.gather(
        *(_limited(client.segment(c, photo.jpeg)) for c in to_segment), return_exceptions=True)
    timings["segment"] = int((time.perf_counter() - t0) * 1000)

    masks_by_category: dict[str, list[Mask]] = {}
    for category, res in zip(to_segment, results):
        if isinstance(res, Exception):
            log.warning("SAM failed for a prompt: %s", type(res).__name__)
            warnings.append(f"Could not outline '{category}': {type(res).__name__}: {str(res)[:160]}")
        else:
            masks_by_category[category] = res

    items = build_items(photo_id, photo.taken_at, ident.items, masks_by_category)
    return PhotoResult(photo_id=photo_id, photo_kind=ident.photo_kind, skipped=False,
                       items=items, timings_ms=timings, warnings=warnings)
