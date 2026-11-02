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
