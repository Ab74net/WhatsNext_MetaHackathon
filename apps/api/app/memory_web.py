"""Memory web: rooms, confirmed items, and "did you own this?" prompts for things people
often forget. Suggestions are only prompts: nothing joins the inventory until the user adds
a photo where the item is found and confirms it. Evidence grades come from rules only.
"""

import json
import re

from pydantic import BaseModel, ValidationError

from . import config
from .merge import SYNONYMS
from .schemas import EvidenceGrade, InventoryItem, MemoryRoom, MemorySuggestion, MemoryWeb

MAX_SUGGESTIONS = 12

PROMPT = """You help a wildfire survivor remember belongings for an insurance claim.
Here are the items they have confirmed so far (id: description):
{items}

1. Group the items into the rooms they most likely came from (for example Living room, Bedroom, Kitchen, Garage). Use every id exactly once.
2. Suggest up to {n} other belongings that people who own these things very often also own and forget to claim. Each suggestion must be a common household item closely related to one or more listed items (a sofa suggests throw pillows, a side table, a floor lamp, a rug). Do not suggest anything already listed. Do not suggest food, consumables, fixtures built into the house, or anything unusual or expensive just because it might be valuable.
For each suggestion give a short lowercase noun as name, the room, the related item ids, a reason under 12 words, and where the user might find proof of ownership (under 15 words), such as older photos, order emails or bank statements."""

SCHEMA = {
    "type": "object", "additionalProperties": False, "required": ["rooms", "suggestions"],
    "properties": {
        "rooms": {"type": "array", "items": {
            "type": "object", "additionalProperties": False, "required": ["name", "item_ids"],
            "properties": {"name": {"type": "string"}, "item_ids": {"type": "array", "items": {"type": "string"}}}}},
        "suggestions": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "required": ["name", "room", "related_item_ids", "reason", "proof_hint"],
            "properties": {"name": {"type": "string"}, "room": {"type": "string"},
                           "related_item_ids": {"type": "array", "items": {"type": "string"}},
                           "reason": {"type": "string"}, "proof_hint": {"type": "string"}}}},
    },
}


class _Room(BaseModel):
    name: str
    item_ids: list[str]


class _Suggestion(BaseModel):
    name: str
    room: str
    related_item_ids: list[str]
    reason: str
    proof_hint: str


class _Raw(BaseModel):
    rooms: list[_Room]
    suggestions: list[_Suggestion]


RECEIPT_TIP = "Search your email for order confirmations, or check bank and credit card statements."


def grade(item: InventoryItem) -> EvidenceGrade:
    dated = any(p.taken_at for p in item.photos)
    count = len(item.photos)
    brand = bool(item.brand)
    if dated and (count >= 2 or brand):
        g = "strong"
    elif dated or count >= 2:
        g = "fair"
    else:
        g = "weak"
    tips = []
    if not dated:
        tips.append("Find an older photo of it with a date: your camera roll, cloud backups or social media posts.")
    if count < 2:
        tips.append("A second photo from another day or angle makes it stronger.")
    if not brand:
        tips.append("A close-up of the label or model number helps value it.")
    tips.append(RECEIPT_TIP)
    return EvidenceGrade(grade=g, has_dated_photo=dated, photo_count=count, has_brand=brand,
                         has_receipt=False, tips=tips)


def _loose_key(name: str) -> str:
    """Loose match for "already owned": synonyms and plurals compare equal
    ("Throw pillows" == "throw pillow" == "pillow")."""
    c = SYNONYMS.get(" ".join(name.lower().split()), " ".join(name.lower().split()))
    if c.endswith("s") and not c.endswith("ss"):
        c = c[:-1]
    return SYNONYMS.get(c, c)


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "other"


def assemble(raw: _Raw, items: list[InventoryItem], known_categories: set[str] = frozenset()) -> MemoryWeb:
    """Check model output against the real inventory: unknown ids are dropped, items the
    model left out go to an "Other" room, and suggestions for anything already in the
    inventory (confirmed or not) are removed."""
    ids = {i.id for i in items}
    rooms: dict[str, MemoryRoom] = {}
    placed: set[str] = set()
    for r in raw.rooms:
        rid = _slug(r.name)
        room = rooms.setdefault(rid, MemoryRoom(id=rid, name=r.name.strip().capitalize(), item_ids=[]))
        for iid in r.item_ids:
            if iid in ids and iid not in placed:
                room.item_ids.append(iid)
                placed.add(iid)
    missing = [i.id for i in items if i.id not in placed]
    if missing:
        rooms.setdefault("other", MemoryRoom(id="other", name="Other", item_ids=[])).item_ids.extend(missing)
    rooms = {k: v for k, v in rooms.items() if v.item_ids}

    owned = {_loose_key(c) for c in known_categories} | {_loose_key(i.category) for i in items}
    suggestions: list[MemorySuggestion] = []
    seen: set[str] = set()
    for s in raw.suggestions:
        key = _loose_key(s.name)
        if not key or key in owned or key in seen:
            continue
        rid = _slug(s.room)
        if rid not in rooms:
            rid = next(iter(rooms), "other")
        seen.add(key)
        suggestions.append(MemorySuggestion(
            id=f"s-{_slug(key)}", name=s.name.strip().lower(), room_id=rid,
            related_item_ids=[i for i in s.related_item_ids if i in ids],
            reason=s.reason.strip(), proof_hint=s.proof_hint.strip()))
        if len(suggestions) >= MAX_SUGGESTIONS:
            break
    return MemoryWeb(rooms=list(rooms.values()), suggestions=suggestions, grades={i.id: grade(i) for i in items})


def _describe(item: InventoryItem) -> str:
    return " ".join(p for p in (item.brand, item.model, item.category) if p)


async def build(client, items: list[InventoryItem], known_categories: set[str] = frozenset()) -> MemoryWeb:
    """items: confirmed items (the graph). known_categories: every category in the inventory,
    so nothing already found by the scan is suggested again."""
    if not items:
        return MemoryWeb(rooms=[], suggestions=[], grades={})
    if config.MOCK:
        raw = _Raw(rooms=[_Room(name="Living room", item_ids=[i.id for i in items])],
                   suggestions=[_Suggestion(name="throw pillow", room="Living room", related_item_ids=[items[0].id],
                                            reason="Mock: sofas usually come with pillows.", proof_hint="Older photos")])
        return assemble(raw, items, known_categories)
    listing = "\n".join(f"{i.id}: {_describe(i)}" for i in items)
    last_error = ""
    for _attempt in range(2):
        res = await client.client.responses.create(
            model=config.SPARK_MODEL,
            input=PROMPT.format(items=listing, n=MAX_SUGGESTIONS),
            text={"format": {"type": "json_schema", "name": "memory_web", "schema": SCHEMA, "strict": True}},
            reasoning={"effort": "low"},
        )
        try:
            return assemble(_Raw.model_validate(json.loads(res.output_text)), items, known_categories)
        except (json.JSONDecodeError, ValidationError) as err:
            last_error = str(err)[:200]
    raise RuntimeError(f"Memory web output was invalid twice: {last_error}")
