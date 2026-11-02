"""Data shapes shared with the frontend. Mirror: packages/shared/src/types.ts.

InventoryItem follows the stable item schema in README.md; export and UI depend on it.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

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


# --- Assistant: case file and UI instructions --------------------------------------
# The assistant answers with typed UI instructions that the frontend renders as cards
# and map layers. Mirror: packages/shared/types.ts (UIInstruction).

Phase = Literal["response", "recovery"]
SourceType = Literal["official", "news"]
YesNoUnknown = Literal["yes", "no", "unknown"]
HomeDamage = Literal["destroyed", "major", "minor", "none", "unknown"]


class CaseFile(BaseModel):
    """What the assistant knows about the user's situation. Shared with the claims helper."""

    preset: Literal["during", "recovery"] = "during"
    home_damage: HomeDamage = "unknown"
    insured: YesNoUnknown = "unknown"
    lost_documents: YesNoUnknown = "unknown"


class Alert(BaseModel):
    id: str
    title: str
    severity: str
    headline: str
    description: str
    area: str
    effective: str | None
    expires: str | None
    source_name: str
    source_url: str
    source_type: SourceType
    recorded: bool  # true = replayed from the scenario, not live
    geometry: dict | None = None


class FireArea(BaseModel):
    name: str
    acres: int
    discovered: str
    geometry: dict


class AlertsCard(BaseModel):
    type: Literal["alerts"] = "alerts"
    live: list[Alert]
    live_checked_at: str
    live_source_url: str
    live_error: str | None = None
    recorded: list[Alert]
    fire_areas: list[FireArea]
    fire_areas_source: dict


class Resource(BaseModel):
    id: str
    kind: Literal["shelter", "animal_shelter", "clinic", "recovery_center"]
    name: str
    address: str
    lat: float
    lon: float
    phone: str | None
    hours: str | None
    notes: str | None
    source_name: str
    source_url: str
    source_type: SourceType
    checked_at: str


class ResourceList(BaseModel):
    type: Literal["resources"] = "resources"
    kinds: list[str]
    items: list[Resource]
    note: str


class HowStep(BaseModel):
    label: str
    url: str | None = None
    phone: str | None = None
    action: Literal["start_claim"] | None = None


class PlanItem(BaseModel):
    program_id: str
    text: str
    detail: str
    status: Literal["available", "pending", "not_available"]
    status_note: str | None = None
    amount: str | None = None
    deadline_note: str | None = None
    how: list[HowStep]
    action: Literal["start_claim"] | None = None
    source_name: str
    source_url: str
    checked_at: str


class PlanCard(BaseModel):
    type: Literal["plan"] = "plan"
    phase: Phase
    today: list[PlanItem]
    this_week: list[PlanItem]
    deadlines: list[PlanItem]
    based_on: CaseFile


class ClaimStart(BaseModel):
    type: Literal["claim_start"] = "claim_start"
    reason: str


class ToolkitLink(BaseModel):
    type: Literal["toolkit_link"] = "toolkit_link"
    tab: Literal["documents", "insurer_call"]
    reason: str


class EmergencyCard(BaseModel):
    type: Literal["emergency"] = "emergency"


class SafetyStep(BaseModel):
    icon: str
    title: str
    text: str
    source: str  # id into SafetyFlowCard.sources
    action: Literal["start_claim"] | None = None


class SafetyBranch(BaseModel):
    id: str
    label: str
    hint: str
    tone: Literal["danger", "warn", "neutral"]
    emergency: bool = False
    steps: list[SafetyStep]


class SafetySource(BaseModel):
    id: str
    name: str
    url: str


class SafetyFlowCard(BaseModel):
    """Pre-authored safety steps (content/safety). The model only picks the starting branch."""

    type: Literal["safety_flow"] = "safety_flow"
    title: str
    question: str
    disclaimer: str
    sources: list[SafetySource]
    checked_at: str
    branches: list[SafetyBranch]
    initial: str | None


UIInstruction = Annotated[AlertsCard | ResourceList | PlanCard | ClaimStart | ToolkitLink | EmergencyCard | SafetyFlowCard,
                          Field(discriminator="type")]


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=4000)


class AgentRequest(BaseModel):
    messages: list[ChatTurn] = Field(min_length=1, max_length=40)
    case: CaseFile = CaseFile()


class AgentResponse(BaseModel):
    message: str
    ui: list[UIInstruction]
    case: CaseFile
    tools_used: list[str]


# --- Memory web ---------------------------------------------------------------------------


class EvidenceGrade(BaseModel):
    """How well an item is proven. Rules only (see memory_web.grade); never model output."""

    grade: Literal["strong", "fair", "weak"]
    has_dated_photo: bool
    photo_count: int
    has_brand: bool
    has_receipt: bool  # receipts aren't collected yet, so always false
    tips: list[str]  # where to find more proof


class MemoryRoom(BaseModel):
    id: str
    name: str
    item_ids: list[str]


class MemorySuggestion(BaseModel):
    id: str
    name: str  # short noun, also the prompt used to look for it in a photo
    room_id: str
    related_item_ids: list[str]
    reason: str
    proof_hint: str


class MemoryWeb(BaseModel):
    rooms: list[MemoryRoom]
    suggestions: list[MemorySuggestion]
    grades: dict[str, EvidenceGrade]


# --- Toolkit: insurer-call prep ----------------------------------------------------
# Privacy: the request carries ONLY the hazard type and whether the user has an inventory.
# Policy numbers, names, addresses and call notes never leave the browser.

Hazard = Literal["wildfire", "flood", "hurricane", "tornado", "earthquake", "other"]


class InsurerQuestionsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")  # reject anything else a client tries to send
    hazard: Hazard
    has_inventory: bool


class InsurerQuestion(BaseModel):
    text: str = Field(min_length=8, max_length=200)
    why: str = Field(max_length=200)


class InsurerQuestions(BaseModel):
    questions: list[InsurerQuestion] = Field(min_length=3, max_length=12)
    tailored: bool  # false: the static base list (Spark unavailable or its output was rejected)


# --- Toolkit: document replacement order -------------------------------------------
# Curated data in content/documents/<state>.json is the source of truth, never the model.

DocPhase = Literal["48h", "week", "later"]
DocWhere = Literal["online", "in_person", "phone", "mail"]


class DocumentPhase(BaseModel):
    id: DocPhase
    label: str
    why: str


class DocumentEntry(BaseModel):
    id: str
    name: str
    phase: DocPhase
    issuing_agency: str
    official_url: str  # "" when not confirmed
    prerequisites: list[str]
    prerequisites_verified: bool
    prerequisites_note: str = ""
    needed_items: list[str]
    where: list[DocWhere]
    steps: list[str]
    phone: str
    disaster_waiver_note: str
    fees_note: str
    timing_note: str = ""
    id_card_note: str = ""
    last_verified: str
    verified: bool
    unverified_fields: list[str]
    sources: list[str]


class DocumentGuide(BaseModel):
    state: str
    state_name: str
    checked_at: str
    phases: list[DocumentPhase]
    documents: list[DocumentEntry]


class DocumentState(BaseModel):
    state: str
    state_name: str
    available: bool


class DocumentQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    state: str = Field(min_length=2, max_length=2)
    doc_ids: list[str] = Field(min_length=1, max_length=12)
    question: str = Field(min_length=3, max_length=300)  # the browser strips numbers and emails first


class DocumentAnswer(BaseModel):
    answer: str = Field(max_length=900)
    doc_ids: list[str]  # the entries the answer is based on
    covered: bool  # false: the data file doesn't cover it, so the answer says to call the agency
