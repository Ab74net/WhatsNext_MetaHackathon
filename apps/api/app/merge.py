"""Merging the same physical item seen in several photos.

Flow: group items by normalized category -> Spark looks at the crops of each group and
says which show the same object -> the members of each group are combined into one item.
Two detections in the same photo are never merged (two pillows on one sofa are two pillows).
Every merge is recorded so the user can split it again.
"""

import asyncio
import logging

from . import config
from .images import crop_jpeg
from .schemas import InventoryItem, MergeGroup
from .sessions import Session

log = logging.getLogger(__name__)

MAX_CROPS_PER_CALL = 16
_limit = asyncio.Semaphore(config.MAX_PARALLEL_SPARK_CALLS)

SYNONYMS = {
    "tv": "television", "flat screen tv": "television", "couch": "sofa", "loveseat": "sofa",
    "potted plant": "plant", "house plant": "plant", "houseplant": "plant", "flowers": "plant",
    "painting": "wall art", "framed picture": "wall art", "picture frame": "wall art",
    "picture": "wall art", "poster": "wall art", "artwork": "wall art",
    "sneakers": "shoe", "shoes": "shoe", "boots": "boot", "books": "book",
    "throw pillow": "pillow", "cushion": "pillow", "throw blanket": "blanket",
    "nightstand": "side table", "end table": "side table", "bookshelf": "bookcase",
    "computer monitor": "monitor", "notebook computer": "laptop",
    "area rug": "rug", "throw rug": "rug", "desk chair": "office chair", "computer chair": "office chair",
    "bed sheets": "bedding", "sheets": "bedding", "comforter": "bedding", "duvet": "bedding",
}


def category_key(category: str, known: set[str]) -> str:
    """Normalize a category for grouping: synonyms, then plural -> singular if the
    singular is also used in this session ("chairs" joins "chair")."""
    c = " ".join(category.strip().lower().split())
    c = SYNONYMS.get(c, c)
    if c.endswith("s") and not c.endswith("ss") and c[:-1] in known:
        c = c[:-1]
    return c


def candidate_groups(items: list[InventoryItem]) -> dict[str, list[InventoryItem]]:
    """Same-category items that appear in at least two different photos and have a mask
    (a crop is needed to compare them). Groups are sorted by photo date."""
    known = {" ".join(i.category.lower().split()) for i in items}
    groups: dict[str, list[InventoryItem]] = {}
    for it in items:
        if it.photos and it.photos[0].mask is not None and len(it.photos) == 1:
            groups.setdefault(category_key(it.category, known), []).append(it)
    out = {}
    for key, members in groups.items():
        if len({m.photos[0].photo_id for m in members}) >= 2:
            out[key] = sorted(members, key=lambda m: m.photos[0].taken_at or "")[:MAX_CROPS_PER_CALL]
    return out


def enforce_partition(groups: list[list[int]], n: int) -> list[list[int]]:
    """Make model output a clean partition of 0..n-1: drop out-of-range and repeated
    indices, and give every missing index its own group."""
    seen: set[int] = set()
    clean = []
    for g in groups:
        g2 = [i for i in g if 0 <= i < n and i not in seen]
        seen.update(g2)
        if g2:
            clean.append(g2)
    clean.extend([i] for i in range(n) if i not in seen)
    return clean


def split_same_photo(group: list[InventoryItem]) -> list[list[InventoryItem]]:
    """A group may hold at most one detection per photo; extras start new groups."""
    buckets: list[list[InventoryItem]] = []
    for it in group:
        pid = it.photos[0].photo_id
        for b in buckets:
            if all(m.photos[0].photo_id != pid for m in b):
                b.append(it)
                break
        else:
            buckets.append([it])
    return buckets


def combine(members: list[InventoryItem]) -> InventoryItem:
    """One item from several sightings. The most confident sighting supplies the details;
    brand/model come from whichever sighting could read them. Confirmed only if every
    sighting was confirmed, so a merge never confirms anything on the user's behalf."""
    primary = max(members, key=lambda m: m.confidence)
    photos = sorted((p for m in members for p in m.photos), key=lambda p: p.taken_at or "")
    by_conf = sorted(members, key=lambda m: -m.confidence)
    return primary.model_copy(update={
        "brand": next((m.brand for m in by_conf if m.brand), None),
        "model": next((m.model for m in by_conf if m.model), None),
        "evidence": "seen_in_photo" if any(m.evidence == "seen_in_photo" for m in members) else "inferred",
        "photos": photos,
        "estimated_replacement_usd": next((m.estimated_replacement_usd for m in by_conf if m.estimated_replacement_usd), None),
        "user_confirmed": all(m.user_confirmed for m in members),
    })


def apply_merge(session: Session, members: list[InventoryItem], category: str, reason: str) -> MergeGroup:
    merged = combine(members)
    for m in members:
        session.items.pop(m.id, None)
    session.items[merged.id] = merged
    # Remember the originals so a split restores exactly what was there.
    originals = [o for m in members for o in session.merged_from.pop(m.id, [m])]
    session.merged_from[merged.id] = originals
    return MergeGroup(kept_id=merged.id, merged_ids=[m.id for m in members if m.id != merged.id],
                      category=category, reason=reason)


def split(session: Session, item_id: str) -> list[InventoryItem]:
    item = session.items.get(item_id)
    if item is None:
        return []
    originals = session.merged_from.pop(item_id, None)
    if originals is None:
        # Not a recorded merge: one item per photo.
        originals = [item.model_copy(update={"id": f"{item.id}_{i}" if i else item.id, "photos": [p]})
                     for i, p in enumerate(item.photos)]
    del session.items[item_id]
    for o in originals:
        session.items[o.id] = o
    return originals


async def _decide(client, session: Session, key: str, members: list[InventoryItem]):
    crops = []
    for m in members:
        ev = m.photos[0]
        crops.append((crop_jpeg(session.photos[ev.photo_id].photo.jpeg, ev.mask.bounds), ev.taken_at))
    async with _limit:
        return await client.group_same_items(key, crops)


async def auto_merge(client, session: Session) -> list[MergeGroup]:
    groups = candidate_groups(list(session.items.values()))
    # One Spark call per category, all in parallel; merges are applied afterwards.
    decisions = await asyncio.gather(*(_decide(client, session, k, m) for k, m in groups.items()),
                                     return_exceptions=True)
    merges: list[MergeGroup] = []
    for (key, members), decision in zip(groups.items(), decisions):
        if isinstance(decision, Exception):
            log.warning("merge check failed for a category: %s", type(decision).__name__)
            continue
        if any(m.id not in session.items for m in members):
            continue  # the user edited these items while the check ran
        for g in enforce_partition([d.images for d in decision.groups], len(members)):
            reason = next((d.reason for d in decision.groups if set(g) <= set(d.images)), "")
            for bucket in split_same_photo([members[i] for i in g]):
                if len(bucket) > 1:
                    merges.append(apply_merge(session, bucket, key, reason))
    return merges
