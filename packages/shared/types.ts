// Data shapes shared with the backend. Mirror: apps/api/app/schemas.py — change both together.
// InventoryItem follows the stable item schema in README.md; export and UI depend on it.

export type Condition = "good" | "worn" | "damaged" | "unknown";
export type Evidence = "seen_in_photo" | "inferred";
export type PhotoKind = "room_or_belongings" | "id_or_document" | "screenshot" | "other";

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
  source_url: string;
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
}

export interface PhotoResult {
  photo_id: string;
  photo_kind: PhotoKind;
  skipped: boolean;
  items: InventoryItem[];
  timings_ms: Record<string, number>;
  warnings: string[];
}

export interface Health {
  ok: boolean;
  mock: boolean;
  spark_model: string;
  sam_model: string;
  project_name: string;
  agent_name: string;
}
