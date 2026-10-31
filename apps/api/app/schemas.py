"""Data shapes shared with the frontend. Mirror: packages/shared/src/types.ts.

InventoryItem follows the stable item schema in README.md; export and UI depend on it.
"""

from typing import Literal

from pydantic import BaseModel, Field

Condition = Literal["good", "worn", "damaged", "unknown"]
Evidence = Literal["seen_in_photo", "inferred"]
PhotoKind = Literal["room_or_belongings", "id_or_document", "screenshot", "other"]


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
    source_url: str


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


# --- API responses -----------------------------------------------------------------------


class PhotoMeta(BaseModel):
    photo_id: str
    filename: str
    width: int
    height: int
    taken_at: str | None
    has_gps: bool  # GPS itself stays server-side in memory (for merging in Phase 3)


class PhotoResult(BaseModel):
    photo_id: str
    photo_kind: PhotoKind
    skipped: bool  # true for IDs, documents and screenshots
    items: list[InventoryItem]
    timings_ms: dict[str, int]
    warnings: list[str] = []


class Health(BaseModel):
    ok: bool
    mock: bool
    spark_model: str
    sam_model: str
    project_name: str
    agent_name: str
