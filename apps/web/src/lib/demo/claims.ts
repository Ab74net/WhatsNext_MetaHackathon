import type { InventoryItem, MemoryWeb, MergeGroup, PhotoResult } from "@shared/types";
import type { ItemPatch, ScanClient } from "../adapters/contracts";
import { DEMO_STORAGE_KEY } from "./config.ts";
import { REMEMBERED_ITEMS, SAMPLE_PHOTOS, sampleEstimate, sampleMeta, samplePhoto } from "./samples.ts";

interface DemoClaim {
  version: 1; id: string; photos: string[]; items: Record<string, InventoryItem>;
  merges: MergeGroup[]; originals: Record<string, InventoryItem[]>; skipAuto: string[];
}
let current: DemoClaim | null = null;
let loaded = false;
const copy = <T>(value: T): T => structuredClone(value);
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
function load() {
  if (loaded) return;
  loaded = true;
  try {
    const value: DemoClaim = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "null");
    if (!value || value.version !== 1 || typeof value.id !== "string" || !Array.isArray(value.photos) || !value.items || !Array.isArray(value.merges) || !value.originals || !Array.isArray(value.skipAuto)) return;
    value.photos.forEach(samplePhoto);
    if (Object.keys(value.items).length > 200) return;
    for (const item of Object.values(value.items)) {
      if (!item.id || typeof item.category !== "string" || typeof item.user_confirmed !== "boolean" || !Array.isArray(item.photos)) return;
      item.photos.forEach(p => samplePhoto(p.photo_id));
      // Stored estimates cannot introduce remote links, or claim to be checked research.
      item.estimated_replacement_usd = item.estimated_replacement_usd ? sampleEstimate(item.category) : null;
    }
    current = value;
  } catch { /* Blocked/corrupt storage: use memory only. */ }
}
function save() {
  try { if (current) localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(current)); else localStorage.removeItem(DEMO_STORAGE_KEY); } catch { /* The memory copy remains usable. */ }
}
function session(id: string) {
  load();
  if (!current || current.id !== id) throw new Error("This sample session has ended. Choose a sample set to start again.");
  return current;
}
export function restoreDemoClaim() { load(); return copy(current); }
export function confirmedItems(id: string) { return copy(Object.values(session(id).items).filter(i => i.user_confirmed)); }
function merge(id: string, ids: string[], reason: string) {
  const state = session(id);
  const originals = ids.map(id => state.items[id]);
  if (originals.some(i => !i) || originals.length < 2) throw new Error("Select at least two existing sample items.");
  const first = originals[0];
  const seen = new Set<string>();
  const photos = originals.flatMap(i => i.photos).filter(p => { if (seen.has(p.photo_id)) return false; seen.add(p.photo_id); return true; });
  const combined: InventoryItem = { ...copy(first), photos: copy(photos), user_confirmed: originals.every(i => i.user_confirmed), estimated_replacement_usd: null };
  state.originals[first.id] = copy(originals);
  ids.forEach(id => delete state.items[id]);
  state.items[first.id] = combined;
  state.merges = state.merges.filter(m => !ids.includes(m.kept_id));
  state.merges.push({ kept_id: first.id, merged_ids: ids.slice(1), category: first.category, reason });
  save(); return copy(combined);
}
function memory(state: DemoClaim): MemoryWeb {
  const items = Object.values(state.items).filter(i => i.user_confirmed);
  const rooms = [...new Set(items.map(i => samplePhoto(i.photos[0].photo_id).room))].map(name => ({
    id: name.toLowerCase().replaceAll(" ", "-"), name,
    item_ids: items.filter(i => samplePhoto(i.photos[0].photo_id).room === name).map(i => i.id),
  }));
  return { rooms, suggestions: REMEMBERED_ITEMS.filter(target => !Object.values(state.items).some(i => i.category === target.category)).flatMap(target => {
    const room = rooms.find(r => r.name === samplePhoto(target.photos[0].photo_id).room);
    return room ? [{ id: `suggest-${target.id}`, name: target.category, room_id: room.id, related_item_ids: room.item_ids,
      reason: `Sample relationship: a ${target.category} may belong in this room. This is a static suggestion, not a finding.`,
      proof_hint: `Attach the supplied ${samplePhoto(target.photos[0].photo_id).room.toLowerCase()} sample to reveal a prewritten example. Real photos are never accepted.` }] : [];
  }), grades: Object.fromEntries(items.map(i => [i.id, { grade: "weak" as const, has_dated_photo: false, photo_count: i.photos.length, has_brand: !!i.brand, has_receipt: false,
    tips: ["Sample evidence grade only. These are demonstration images, not proof of your ownership.", ...(i.photos.length > 1 ? ["The duplicate example uses a detail crop of the same image, not independent evidence."] : [])] }])) };
}

export const demoScanClient: Omit<ScanClient, "health"> = {
  createSession: async () => { load(); current = { version: 1, id: crypto.randomUUID(), photos: [], items: {}, merges: [], originals: {}, skipAuto: [] }; save(); return { session_id: current.id }; },
  endSession: async (id) => { session(id); current = null; save(); return { deleted: true }; },
  endSessionBeacon: () => true, // No beacon; demo progress is intentionally local and may survive a reload.
  uploadPhoto: async (id, file) => {
    const state = session(id);
    // Only an empty internal token naming a known fixture can enter this adapter.
    if (file.size !== 0) throw new Error("This demo does not accept personal files.");
    const photoId = file.name.replace(/\.webp$/, "");
    samplePhoto(photoId);
    await pause(250);
    session(id);
    const meta = sampleMeta(photoId);
    if (state.photos.includes(photoId)) meta.duplicate_of = photoId;
    else state.photos.push(photoId);
    save(); return meta;
  },
  extract: async (id, photoId) => {
    await pause(1400 + SAMPLE_PHOTOS.findIndex(p => p.id === photoId) * 120);
    const state = session(id);
    const items = copy(samplePhoto(photoId).items);
    for (const item of items) if (!state.items[item.id]) state.items[item.id] = item;
    save();
    return { photo_id: photoId, photo_kind: "room_or_belongings", skipped: false, items, timings_ms: {}, warnings: ["Precomputed sample detections; no model was run."] } as PhotoResult;
  },
  photoUrl: (_id, pid) => samplePhoto(pid).src,
  patchItem: async (id, iid, patch: ItemPatch) => {
    const state = session(id), item = state.items[iid];
    if (!item) throw new Error("Sample item no longer exists.");
    const next = { ...item, ...patch };
    if (!next.category.trim() || next.category.length > 100) throw new Error("Use an item name between 1 and 100 characters.");
    if (next.category !== item.category || next.brand !== item.brand || next.model !== item.model) next.estimated_replacement_usd = null;
    state.items[iid] = next; save(); return copy(next);
  },
  deleteItem: async (id, iid) => { const state = session(id); delete state.items[iid]; state.merges = state.merges.filter(m => m.kept_id !== iid); delete state.originals[iid]; save(); return { deleted: true }; },
  autoMerge: async (id) => {
    await pause(900);
    const state = session(id);
    const ids = ["living-room-coffee-table", "living-detail-coffee-table"];
    if (ids.every(i => state.items[i]) && !ids.some(i => state.skipAuto.includes(i))) merge(id, ids, "Sample duplicate: wide image and its labeled detail crop");
    return { items: copy(Object.values(state.items)), merges: copy(state.merges) };
  },
  mergeItems: async (id, ids) => merge(id, ids, "Manually merged in this sample session"),
  splitItem: async (id, iid) => {
    const state = session(id), item = state.items[iid];
    const originals = state.originals[iid];
    if (!originals) return item ? [copy(item)] : [];
    delete state.items[iid];
    for (const part of originals) { state.items[part.id] = { ...copy(part), user_confirmed: item?.user_confirmed ?? false }; state.skipAuto.push(part.id); }
    state.merges = state.merges.filter(m => m.kept_id !== iid); delete state.originals[iid]; save(); return copy(originals.map(p => state.items[p.id]));
  },
  valueItem: async (id, iid) => { await pause(300); const item = session(id).items[iid]; if (!item) throw new Error("Sample item no longer exists."); item.estimated_replacement_usd = sampleEstimate(item.category); save(); return copy(item); },
  memoryWeb: async id => { await pause(350); return memory(session(id)); },
  addFromPhoto: async (id, file, category) => {
    if (file.size !== 0 || file.name !== "sample-evidence") throw new Error("Attach a supplied sample photo only.");
    await pause(650);
    const state = session(id), target = REMEMBERED_ITEMS.find(i => i.category === category);
    if (!target) throw new Error("No supplied sample photo shows this suggestion.");
    const item = copy(state.items[target.id] || target), pid = item.photos[0].photo_id;
    state.items[item.id] = item;
    if (!state.photos.includes(pid)) state.photos.push(pid);
    save(); return { item: copy(item), photo: sampleMeta(pid) };
  },
  exportUrl: () => "#", // Public downloads are generated by demo/exports.ts when clicked.
};
