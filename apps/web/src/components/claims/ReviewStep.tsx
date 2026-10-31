"use client";

// Step 3: review the inventory. Every line must be confirmed by the user, one at a time
// (no "confirm all": the claim must reflect what the user actually owned).

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Condition, InventoryItem, PhotoMeta } from "@shared/types";
import type { ClaimSession } from "@/lib/useClaimSession";
import type { ItemPatch } from "@/lib/api";
import { ItemCrop, PhotoWithMasks, colorFor } from "@/components/PhotoWithMasks";

type Filter = "all" | "todo" | "confirmed";
const CONDITIONS: Condition[] = ["good", "worn", "damaged", "unknown"];

export function ReviewStep({ session, onAddMore }: { session: ClaimSession; onAddMore: () => void }) {
  const { items, photos, photoUrl, patchItem, removeItem } = session;
  const [filter, setFilter] = useState<Filter>("all");
  const [viewing, setViewing] = useState<InventoryItem | null>(null);

  // Photo metadata and each item's color (its position in its photo, matching the scan view).
  const { metaById, colorIndex } = useMemo(() => {
    const metaById: Record<string, PhotoMeta> = {};
    const colorIndex: Record<string, number> = {};
    for (const p of photos) {
      if (p.meta) metaById[p.meta.photo_id] = p.meta;
      p.result?.items.forEach((it, i) => (colorIndex[it.id] = i));
    }
    return { metaById, colorIndex };
  }, [photos]);

  const all = Object.values(items);
  const confirmedCount = all.filter((i) => i.user_confirmed).length;
  const shown = all.filter((i) => (filter === "all" ? true : filter === "confirmed" ? i.user_confirmed : !i.user_confirmed));
  const groups = Object.entries(
    shown.reduce<Record<string, InventoryItem[]>>((acc, it) => ((acc[it.category] ??= []).push(it), acc), {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
        <div className="min-w-48 flex-1">
          <p className="font-medium">{confirmedCount} of {all.length} items confirmed</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <motion.div className="h-full rounded-full bg-good"
              animate={{ width: `${all.length ? (confirmedCount / all.length) * 100 : 0}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Confirm only things you owned. Fix anything the scan got wrong, and remove what isn’t yours.
          </p>
        </div>
        <div className="flex rounded-full border border-line p-0.5 text-sm">
          {([["all", "All"], ["todo", "To review"], ["confirmed", "Confirmed"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 ${filter === key ? "bg-accent text-accent-ink" : "text-muted"}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={onAddMore} className="rounded-full border border-line px-4 py-2 text-sm hover:bg-surface-2">
          + Add photos
        </button>
      </div>

      {groups.length === 0 && (
        <p className="py-10 text-center text-muted">
          {filter === "confirmed" ? "Nothing confirmed yet." : filter === "todo" ? "All items reviewed." : "No items yet."}
        </p>
      )}

      {groups.map(([category, list]) => (
        <section key={category}>
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wider text-muted">
            {category} <span className="text-muted/70">· {list.length}</span>
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            <AnimatePresence initial={false}>
              {list.map((item) => {
                const ev = item.photos[0];
                const meta = metaById[ev.photo_id];
                return (
                  <ItemCard key={item.id} item={item} meta={meta} src={meta ? photoUrl(meta.photo_id) : ""}
                    color={colorFor(colorIndex[item.id] ?? 0)}
                    onView={() => setViewing(item)}
                    onPatch={(patch) => patchItem(item.id, patch)}
                    onRemove={() => removeItem(item.id)} />
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      ))}

      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur sm:bottom-4">
        <span className="text-sm text-muted">Spreadsheet and PDF export with evidence photos is next.</span>
        <button disabled className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-ink opacity-40">
          Export claim
        </button>
      </div>

      <AnimatePresence>
        {viewing && metaById[viewing.photos[0].photo_id] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setViewing(null)}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
            <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full w-full max-w-3xl overflow-auto rounded-2xl bg-surface p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="font-medium capitalize">{viewing.category} · evidence photo</p>
                <button onClick={() => setViewing(null)} className="text-muted hover:text-ink" aria-label="Close">✕</button>
              </div>
              {(() => {
                const meta = metaById[viewing.photos[0].photo_id];
                const photoItems = photos.find((p) => p.meta?.photo_id === meta.photo_id)?.result?.items ?? [];
                return <PhotoWithMasks src={photoUrl(meta.photo_id)} meta={meta} items={photoItems}
                  highlightId={viewing.id} className="rounded-lg" />;
              })()}
              <p className="mt-2 px-1 text-xs text-muted">
                {viewing.photos[0].taken_at
                  ? `Photo taken ${new Date(viewing.photos[0].taken_at).toLocaleDateString()}`
                  : "This photo has no date. A dated photo or a receipt is stronger evidence."}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ItemCard({ item, meta, src, color, onView, onPatch, onRemove }: {
  item: InventoryItem;
  meta: PhotoMeta | undefined;
  src: string;
  color: string;
  onView: () => void;
  onPatch: (patch: ItemPatch) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ category: item.category, brand: item.brand ?? "", model: item.model ?? "" });
  const mask = item.photos[0]?.mask ?? null;

  function save() {
    onPatch({ category: draft.category.trim() || item.category, brand: draft.brand, model: draft.model });
    setEditing(false);
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className={`flex gap-3 rounded-xl border bg-surface p-2.5 transition-colors ${
        item.user_confirmed ? "border-good/50" : "border-line"}`}>
      <button onClick={onView} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg" aria-label="View evidence photo">
        {meta && <ItemCrop src={src} meta={meta} mask={mask} color={color} />}
        {!mask && <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[10px] text-white">no outline</span>}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {editing ? (
          <div className="flex flex-col gap-1.5 text-sm">
            <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              placeholder="What is it?" className="rounded-md border border-line bg-bg px-2 py-1" />
            <div className="flex gap-1.5">
              <input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                placeholder="Brand" className="w-1/2 rounded-md border border-line bg-bg px-2 py-1" />
              <input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                placeholder="Model" className="w-1/2 rounded-md border border-line bg-bg px-2 py-1" />
            </div>
          </div>
        ) : (
          <p className="truncate font-medium capitalize">
            {item.category}
            {(item.brand || item.model) && (
              <span className="font-normal normal-case text-muted"> · {[item.brand, item.model].filter(Boolean).join(" ")}</span>
            )}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`rounded-full px-2 py-0.5 ${item.evidence === "seen_in_photo" ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`}>
            {item.evidence === "seen_in_photo" ? "Seen in photo" : "Inferred"}
          </span>
          <select value={item.condition} onChange={(e) => onPatch({ condition: e.target.value as Condition })}
            className="rounded-full border border-line bg-bg px-1.5 py-0.5" aria-label="Condition">
            {CONDITIONS.map((c) => <option key={c} value={c}>{c === "unknown" ? "condition unknown" : c}</option>)}
          </select>
          <span className="flex items-center gap-1 text-muted" title="How sure the scan is">
            <span className="h-1.5 w-10 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full bg-muted" style={{ width: `${Math.round(item.confidence * 100)}%` }} />
            </span>
            {Math.round(item.confidence * 100)}%
          </span>
        </div>

        <div className="mt-auto flex items-center gap-3 text-xs">
          <button onClick={() => onPatch({ user_confirmed: !item.user_confirmed })}
            className={`rounded-full px-3 py-1 font-medium ${
              item.user_confirmed ? "bg-good text-white" : "border border-good/60 text-good hover:bg-good/10"}`}>
            {item.user_confirmed ? "✓ Confirmed" : "I owned this"}
          </button>
          {editing ? (
            <button onClick={save} className="text-accent hover:underline">Save</button>
          ) : (
            <button onClick={() => setEditing(true)} className="text-muted hover:text-ink">Edit</button>
          )}
          <button onClick={onRemove} className="ml-auto text-muted hover:text-danger">Remove</button>
        </div>
      </div>
    </motion.div>
  );
}
