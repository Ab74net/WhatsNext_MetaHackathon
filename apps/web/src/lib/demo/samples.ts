import data from "./fixtures/photos.json" with { type: "json" };
import type { InventoryItem, PhotoMeta, ValueEstimate } from "@shared/types";

export interface SamplePhoto {
  id: string; room: string; src: string; thumbnail: string; alt: string; width: number; height: number;
  provenance: string; items: InventoryItem[];
}
export const SAMPLE_PHOTOS = data as SamplePhoto[];
export const SAMPLE_SETS = [
  { id: "living", name: "Living room", description: "Sofa, table, and mirror. Includes a labeled detail crop to demonstrate merging.", photos: ["living-room", "living-mirror", "living-detail"] },
  { id: "kitchen", name: "Kitchen", description: "Kitchen objects and a dishwasher, from two supplied example images.", photos: ["kitchen", "dishwasher"] },
  { id: "bedroom", name: "Bedroom", description: "A tower fan, bed, and pillows, from two supplied example images.", photos: ["bedroom", "pillows"] },
] as const;
export function samplePhoto(id: string) {
  const photo = SAMPLE_PHOTOS.find(p => p.id === id);
  if (!photo) throw new Error("Choose one of the supplied sample photos.");
  return photo;
}
export function sampleMeta(id: string): PhotoMeta {
  const p = samplePhoto(id);
  return { photo_id: p.id, filename: `${p.id}.webp`, width: p.width, height: p.height, taken_at: null, has_gps: false, duplicate_of: null };
}

// Hand-authored illustrative ranges. No retailer, source link, or actual valuation is claimed.
export const SAMPLE_PRICES: Record<string, [number, number]> = {
  sofa: [400, 800], pillow: [20, 50], "coffee table": [120, 250], mirror: [80, 200], ottoman: [80, 180], vase: [20, 60],
  "pendant light": [60, 150], "cutting board": [15, 40], dishwasher: [400, 750], "tower fan": [50, 120], bed: [200, 500], book: [10, 30],
  laptop: [500, 900], clock: [20, 50], rug: [80, 180], "cooking pot": [40, 100], "potted plant": [20, 60],
};
export function sampleEstimate(category: string): ValueEstimate {
  const range = SAMPLE_PRICES[category.toLowerCase()];
  if (!range) throw new Error("No sample estimate exists for this edited item name.");
  return { low: range[0], high: range[1], source_url: "", source_title: "Sample data, no source", basis: "Sample estimate for demonstration only; not an appraisal or retail research.", checked_at: "2026-11-12" };
}

function remembered(category: string, photoId: string, box: number[]): InventoryItem {
  return { id: `remembered-${photoId}-${category.replaceAll(" ", "-")}`, category, brand: null, model: null, condition: "good", confidence: .9, evidence: "seen_in_photo",
    photos: [{ photo_id: photoId, taken_at: null, mask: { bounds: { left: box[0], top: box[1], right: box[2], bottom: box[3] }, svg_path: null, confidence: null } }],
    estimated_replacement_usd: null, user_confirmed: false };
}
// Hand-authored boxes for visible objects held back from the initial scan, to illustrate recall.
export const REMEMBERED_ITEMS = [
  remembered("laptop", "living-room", [188, 149, 277, 218]),
  remembered("clock", "living-room", [128, 185, 164, 219]),
  remembered("rug", "living-room", [0, 230, 447, 447]),
  remembered("cooking pot", "kitchen", [403, 394, 451, 426]),
  remembered("potted plant", "bedroom", [0, 134, 172, 427]),
];
