// Data shapes shared with the backend. Mirror: apps/api/app/schemas.py — change both together.
// InventoryItem follows the stable item schema in README.md; export and UI depend on it.

export type Condition = "good" | "worn" | "damaged" | "unknown";
export type Evidence = "seen_in_photo" | "inferred";
export type PhotoKind = "room_or_belongings" | "id_or_document" | "screenshot" | "public_or_workplace" | "other";

export interface MaskBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Mask {
  bounds: MaskBounds; // source pixels of the served (downscaled) photo
  svg_path: string | null; // mask-local coordinates; translate by bounds.left/top
  confidence: number | null;
}

export interface PhotoEvidence {
  photo_id: string;
  taken_at: string | null;
  mask: Mask | null;
}

export interface ValueEstimate {
  low: number;
  high: number;
  source_url: string; // verified: it appeared in the model's own web-search results
  source_title: string | null;
  basis: string;
  checked_at: string; // ISO-8601
}

export interface InventoryItem {
  id: string;
  category: string;
  brand: string | null;
  model: string | null;
  condition: Condition;
  confidence: number;
  evidence: Evidence;
  photos: PhotoEvidence[];
  estimated_replacement_usd: ValueEstimate | null;
  user_confirmed: boolean;
}

export interface PhotoMeta {
  photo_id: string;
  filename: string;
  width: number;
  height: number;
  taken_at: string | null;
  has_gps: boolean;
  duplicate_of: string | null; // set when the same file was already uploaded this session
}

export interface PhotoResult {
  photo_id: string;
  photo_kind: PhotoKind;
  skipped: boolean;
  items: InventoryItem[];
  timings_ms: Record<string, number>;
  warnings: string[];
}

export interface MergeGroup {
  kept_id: string;
  merged_ids: string[];
  category: string;
  reason: string;
}

export interface MergeResult {
  items: InventoryItem[];
  merges: MergeGroup[];
}

export interface Health {
  ok: boolean;
  mock: boolean;
  spark_model: string;
  sam_model: string;
  project_name: string;
  agent_name: string;
}

// --- Assistant: case file and UI instructions (mirror: apps/api/app/schemas.py) ---------

export type ScenarioPresetId = "during" | "recovery";
export type HomeDamage = "destroyed" | "major" | "minor" | "none" | "unknown";
export type YesNoUnknown = "yes" | "no" | "unknown";
export type SourceType = "official" | "news";

export interface CaseFile {
  preset: ScenarioPresetId;
  home_damage: HomeDamage;
  insured: YesNoUnknown;
  lost_documents: YesNoUnknown;
}

export interface Alert {
  id: string;
  title: string;
  severity: string;
  headline: string;
  description: string;
  area: string;
  effective: string | null;
  expires: string | null;
  source_name: string;
  source_url: string;
  source_type: SourceType;
  recorded: boolean; // replayed from the scenario, not live
  geometry: GeoJSON.Geometry | null;
}

export interface FireArea {
  name: string;
  acres: number;
  discovered: string;
  geometry: GeoJSON.Geometry;
}

export interface AlertsCard {
  type: "alerts";
  live: Alert[];
  live_checked_at: string;
  live_source_url: string;
  live_error: string | null;
  recorded: Alert[];
  fire_areas: FireArea[];
  fire_areas_source: { name: string; url: string; retrieved_at: string; note?: string };
}

export type ResourceKind = "shelter" | "animal_shelter" | "clinic" | "recovery_center";

export interface Resource {
  id: string;
  kind: ResourceKind;
  name: string;
  address: string;
  lat: number;
  lon: number;
  phone: string | null;
  hours: string | null;
  notes: string | null;
  source_name: string;
  source_url: string;
  source_type: SourceType;
  checked_at: string;
}

export interface ResourceList {
  type: "resources";
  kinds: string[];
  items: Resource[];
  note: string;
}

export interface HowStep {
  label: string;
  url: string | null;
  phone: string | null;
  action: "start_claim" | null;
}

export interface PlanItem {
  program_id: string;
  text: string;
  detail: string;
  status: "available" | "pending" | "not_available";
  status_note: string | null;
  amount: string | null;
  deadline_note: string | null;
  how: HowStep[];
  action: "start_claim" | null;
  source_name: string;
  source_url: string;
  checked_at: string;
}

export interface PlanCard {
  type: "plan";
  phase: "response" | "recovery";
  today: PlanItem[];
  this_week: PlanItem[];
  deadlines: PlanItem[];
  based_on: CaseFile;
}

export interface ClaimStart {
  type: "claim_start";
  reason: string;
}

export interface EmergencyCard {
  type: "emergency";
}

export interface SafetyStep {
  icon: string;
  title: string;
  text: string;
  source: string; // id into SafetyFlowCard.sources
  action: "start_claim" | null;
}

export interface SafetyBranch {
  id: string;
  label: string;
  hint: string;
  tone: "danger" | "warn" | "neutral";
  emergency: boolean;
  steps: SafetyStep[];
}

export interface SafetyFlowCard {
  type: "safety_flow";
  title: string;
  question: string;
  disclaimer: string;
  sources: { id: string; name: string; url: string }[];
  checked_at: string;
  branches: SafetyBranch[];
  initial: string | null;
}

export type UIInstruction = AlertsCard | ResourceList | PlanCard | ClaimStart | EmergencyCard | SafetyFlowCard;

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AgentResponse {
  message: string;
  ui: UIInstruction[];
  case: CaseFile;
  tools_used: string[];
}

export interface ScenarioPreset {
  id: ScenarioPresetId;
  label: string;
  clock: string | null;
  phase: "response" | "recovery";
  replay: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  hazard: string;
  place: string;
  center: [number, number];
  zoom: number;
  summary: string;
  summary_sources: { name: string; url: string }[];
  presets: ScenarioPreset[];
  fire_areas: GeoJSON.FeatureCollection & { source: { name: string; url: string; retrieved_at: string } };
}

// --- Memory web (mirror: apps/api/app/schemas.py) --------------------------------------------

export interface EvidenceGrade {
  grade: "strong" | "fair" | "weak";
  has_dated_photo: boolean;
  photo_count: number;
  has_brand: boolean;
  has_receipt: boolean;
  tips: string[];
}

export interface MemoryRoom {
  id: string;
  name: string;
  item_ids: string[];
}

export interface MemorySuggestion {
  id: string;
  name: string;
  room_id: string;
  related_item_ids: string[];
  reason: string;
  proof_hint: string;
}

export interface MemoryWeb {
  rooms: MemoryRoom[];
  suggestions: MemorySuggestion[];
  grades: Record<string, EvidenceGrade>;
}

export interface FromPhotoResult {
  item: InventoryItem;
  photo: PhotoMeta;
}

// --- Toolkit: insurer-call prep --------------------------------------------------
// The request carries only these two non-personal fields; everything else stays on device.

export type Hazard = "wildfire" | "flood" | "hurricane" | "tornado" | "earthquake" | "other";

export interface InsurerQuestionsRequest {
  hazard: Hazard;
  has_inventory: boolean;
}

export interface InsurerQuestion {
  text: string;
  why: string;
}

export interface InsurerQuestions {
  questions: InsurerQuestion[];
  tailored: boolean; // false: the static base list
}
