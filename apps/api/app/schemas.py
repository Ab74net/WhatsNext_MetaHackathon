"""Data shapes shared with the frontend. Mirror: packages/shared/src/types.ts.

InventoryItem follows the stable item schema in README.md; export and UI depend on it.
"""

from typing import Literal

from pydantic import BaseModel, Field

Condition = Literal["good", "worn", "damaged", "unknown"]
Evidence = Literal["seen_in_photo", "inferred"]
PhotoKind = Literal["room_or_belongings", "id_or_document", "screenshot", "public_or_workplace", "other"]


# --- Inventory item (stable schema) -------------------------------------------


class MaskBounds(BaseModel):
    left: float
    top: float
    right: float
    bottom: float


class Mask(BaseModel):
    bounds: MaskBounds  # source pixels of the served (downscaled) photo
    svg_path: str | None  # path in mask-local coordinates; translate by bounds.left/top
    confidence: float | None = None


class PhotoEvidence(BaseModel):
    photo_id: str
    taken_at: str | None  # ISO-8601 from EXIF, if present
    mask: Mask | None


class ValueEstimate(BaseModel):
    low: float
    high: float
    source_url: str  # verified: it appeared in the model's own web-search results
    source_title: str | None = None
    basis: str = ""  # one line on what the estimate is based on
    checked_at: str = ""  # ISO-8601 time the price was looked up


class InventoryItem(BaseModel):
    id: str
    category: str
    brand: str | None
    model: str | None
    condition: Condition
    confidence: float = Field(ge=0, le=1)
    evidence: Evidence
    photos: list[PhotoEvidence]
    estimated_replacement_usd: ValueEstimate | None = None  # filled in Phase 3
    user_confirmed: bool = False


class ItemPatch(BaseModel):
    """User edits from the review screen. Evidence and photos can't be edited."""

    category: str | None = Field(default=None, min_length=1)
    brand: str | None = None
    model: str | None = None
    condition: Condition | None = None
    user_confirmed: bool | None = None


# --- Spark structured output ------------------------------------------------------


class IdentifiedItem(BaseModel):
    category: str
    brand: str | None
    model: str | None
    condition: Condition
    confidence: float = Field(ge=0, le=1)
    evidence: Evidence


class PhotoIdentification(BaseModel):
    photo_kind: PhotoKind
    items: list[IdentifiedItem]


class SameItemGroup(BaseModel):
    images: list[int]  # 0-based crop indices (the model sees them 1-based)
    reason: str


class SameItemDecision(BaseModel):
    groups: list[SameItemGroup]


class PriceEstimate(BaseModel):
    low: float = Field(gt=0)
    high: float = Field(gt=0)
    source_url: str | None
    source_title: str | None
    basis: str


# --- API responses -----------------------------------------------------------------------


class PhotoMeta(BaseModel):
    photo_id: str
    filename: str
    width: int
    height: int
    taken_at: str | None
    has_gps: bool  # GPS itself stays server-side in memory
    duplicate_of: str | None = None  # set when the same file was already uploaded this session


class PhotoResult(BaseModel):
    photo_id: str
    photo_kind: PhotoKind
    skipped: bool  # true for IDs, documents, screenshots and public spaces
    items: list[InventoryItem]
    timings_ms: dict[str, int]
    warnings: list[str] = []


class MergeGroup(BaseModel):
    kept_id: str
    merged_ids: list[str]
    category: str
    reason: str


class MergeResult(BaseModel):
    items: list[InventoryItem]
    merges: list[MergeGroup]


class ManualMerge(BaseModel):
    ids: list[str] = Field(min_length=2)


class Health(BaseModel):
    ok: bool
    mock: bool
    spark_model: str
    sam_model: str
    project_name: str
    agent_name: str
