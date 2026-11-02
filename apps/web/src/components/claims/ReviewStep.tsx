"use client";

// Step 3: review the inventory. Every line must be confirmed by the user, one at a time
// (no "confirm all": the claim must reflect what the user actually owned). Items seen in
// several photos were merged automatically; the user can split them or merge by hand.

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, Combine, Images, Layers, Pencil, Plus, Split, Trash2, X,
} from "lucide-react";
import type { Condition, InventoryItem, PhotoMeta } from "@shared/types";
import type { ClaimSession } from "@/lib/useClaimSession";
import type { ItemPatch } from "@/lib/api";
import { ItemCrop, PhotoWithMasks, colorFor } from "@/components/PhotoWithMasks";
import { Badge, Button, Card, EmptyState, ProgressBar } from "@/components/ui";

type Filter = "all" | "todo" | "confirmed";
const CONDITIONS: Condition[] = ["good", "worn", "damaged", "unknown"];

export function ReviewStep({ session, onAddMore, onExport }: {
  session: ClaimSession; onAddMore: () => void; onExport: () => void; // continues to the memory web, then export
}) {
  const { items, photos, photoUrl, patchItem, removeItem, merge, splitItem, mergeItems } = session;
  const [filter, setFilter] = useState<Filter>("all");
  const [viewing, setViewing] = useState<InventoryItem | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

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
  const merges = merge.status === "done" ? merge.merges.filter((g) => items[g.kept_id]) : [];

  async function mergeSelected() {
    setMerging(true);
    await mergeItems([...selected]).catch(() => {});
    setMerging(false);
    setSelected(new Set());
    setSelecting(false);
  }

  const counts: Record<Filter, number> = { all: all.length, todo: all.length - confirmedCount, confirmed: confirmedCount };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-52 flex-1">
            <p className="font-semibold">
              {confirmedCount} of {all.length} items confirmed
            </p>
            <ProgressBar value={all.length ? confirmedCount / all.length : 0} tone="good" className="mt-2" />
            <p className="mt-2 text-[13px] text-muted">
              Confirm only things you owned. Fix anything the scan got wrong, and remove what isn’t yours.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={selecting ? "primary" : "secondary"}
              onClick={() => { setSelecting((s) => !s); setSelected(new Set()); }}>
              <Combine className="size-4" aria-hidden /> {selecting ? "Cancel merge" : "Merge by hand"}
            </Button>
            <Button size="sm" onClick={onAddMore}><Plus className="size-4" aria-hidden /> Add photos</Button>
          </div>
        </div>

        <div className="flex gap-1 border-t border-line pt-3" role="tablist">
          {([["all", "All"], ["todo", "To review"], ["confirmed", "Confirmed"]] as const).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
              className={`h-8 rounded-lg px-3 text-[13px] font-semibold transition ${
                filter === key ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2"}`}>
              {label} <span className="ml-1 tabular-nums opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>
      </Card>

      {merges.length > 0 && !selecting && (
        <Card className="flex flex-col gap-2 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="size-4 text-accent" aria-hidden />
            Matched across photos
          </p>
          <ul className="flex flex-col gap-1.5">
            {merges.map((g) => (
              <li key={g.kept_id} className="flex items-center gap-3 text-sm">
                <span className="font-medium capitalize">{items[g.kept_id]?.category}</span>
                <span className="truncate text-muted">
                  {g.merged_ids.length + 1} photos · {g.reason}
                </span>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => splitItem(g.kept_id)}>
                  Undo
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {selecting && (
        <div className="sticky top-16 z-20">
          <Card className="flex items-center gap-3 px-4 py-3 shadow-pop">
            <Combine className="size-4 text-accent" aria-hidden />
            <span className="flex-1 text-sm">
              Select two or more listings of the <strong>same physical item</strong> seen in different photos.
            </span>
            <Button variant="primary" size="sm" disabled={selected.size < 2} loading={merging} onClick={mergeSelected}>
              Merge {selected.size || ""}
            </Button>
          </Card>
        </div>
      )}

      {groups.length === 0 && (
        <Card>
          <EmptyState icon={<Check className="size-5" />}
            title={filter === "confirmed" ? "Nothing confirmed yet" : filter === "todo" ? "All items reviewed" : "No items yet"}
            body={filter === "todo" ? "Every item has been confirmed or removed. You can export your claim now." : "Confirmed items will appear here."}
            action={filter === "todo" && confirmedCount ? <Button variant="primary" onClick={onExport}>Continue</Button> : undefined} />
        </Card>
      )}

      {groups.map(([category, list]) => (
        <section key={category} className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            {category} <span className="font-normal text-subtle">· {list.length}</span>
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            <AnimatePresence initial={false}>
              {list.map((item) => {
                const meta = metaById[item.photos[0]?.photo_id];
                return (
                  <ItemCard key={item.id} item={item} meta={meta} src={meta ? photoUrl(meta.photo_id) : ""}
                    color={colorFor(colorIndex[item.id] ?? 0)}
                    selecting={selecting} selected={selected.has(item.id)}
                    onSelect={() => setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })}
                    onView={() => setViewing(item)}
                    onPatch={(patch) => patchItem(item.id, patch)}
                    onRemove={() => removeItem(item.id)}
                    onSplit={() => splitItem(item.id)} />
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      ))}

      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <Card className="flex items-center justify-between gap-3 px-4 py-3 shadow-pop">
          <span className="text-sm text-muted">
            {confirmedCount ? <><strong className="text-ink">{confirmedCount}</strong> confirmed and ready to export</> : "Confirm items to export them"}
          </span>
          <Button variant="primary" disabled={!confirmedCount} onClick={onExport}>
            Continue <ArrowRight className="size-4" aria-hidden />
          </Button>
        </Card>
      </div>

      <AnimatePresence>
        {viewing && items[viewing.id] && (
          <PhotoViewer item={items[viewing.id]} metaById={metaById} photoUrl={photoUrl} onClose={() => setViewing(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ItemCard({ item, meta, src, color, selecting, selected, onSelect, onView, onPatch, onRemove, onSplit }: {
  item: InventoryItem;
  meta: PhotoMeta | undefined;
  src: string;
  color: string;
  selecting: boolean;
  selected: boolean;
  onSelect: () => void;
  onView: () => void;
  onPatch: (patch: ItemPatch) => void;
  onRemove: () => void;
  onSplit: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ category: item.category, brand: item.brand ?? "", model: item.model ?? "" });
  const mask = item.photos[0]?.mask ?? null;
  const photoCount = item.photos.length;
  const earliest = item.photos.map((p) => p.taken_at).filter(Boolean).sort()[0];

  function save() {
    onPatch({ category: draft.category.trim() || item.category, brand: draft.brand, model: draft.model });
    setEditing(false);
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
      <Card className={`flex gap-3 p-3 transition ${selected ? "ring-2 ring-accent" : item.user_confirmed ? "ring-1 ring-good/50" : ""}`}
        onClick={selecting ? onSelect : undefined} role={selecting ? "checkbox" : undefined} aria-checked={selecting ? selected : undefined}>
        <button onClick={selecting ? undefined : onView} aria-label="View evidence photos"
          className="relative size-24 shrink-0 overflow-hidden rounded-lg">
          {meta && <ItemCrop src={src} meta={meta} mask={mask} color={color} />}
          {photoCount > 1 && (
            <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <Images className="size-3" aria-hidden /> {photoCount}
            </span>
          )}
          {selecting && (
            <span className={`absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border-2 ${
              selected ? "border-accent bg-accent text-accent-ink" : "border-white bg-black/25"}`}>
              {selected && <Check className="size-3" strokeWidth={3} />}
            </span>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {editing ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="What is it?" aria-label="Item"
                className="h-8 rounded-lg border border-line bg-surface px-2.5" />
              <div className="flex gap-1.5">
                <input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                  placeholder="Brand" aria-label="Brand" className="h-8 w-1/2 rounded-lg border border-line bg-surface px-2.5" />
                <input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                  placeholder="Model" aria-label="Model" className="h-8 w-1/2 rounded-lg border border-line bg-surface px-2.5" />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 truncate font-semibold capitalize">
                {item.category}
                {(item.brand || item.model) && (
                  <span className="font-normal normal-case text-muted"> · {[item.brand, item.model].filter(Boolean).join(" ")}</span>
                )}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            {item.evidence === "seen_in_photo"
              ? <Badge tone="accent">Seen in photo</Badge>
              : <Badge tone="warn">Inferred</Badge>}
            {photoCount > 1 && <Badge tone="good" icon={<Layers className="size-3" />}>{photoCount} photos</Badge>}
            <select value={item.condition} onChange={(e) => onPatch({ condition: e.target.value as Condition })}
              onClick={(e) => e.stopPropagation()} aria-label="Condition"
              className="h-6 rounded-md bg-surface-2 px-1 text-xs font-semibold text-muted">
              {CONDITIONS.map((c) => <option key={c} value={c}>{c === "unknown" ? "Condition?" : c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
            <span className="text-xs text-subtle tabular-nums" title="How sure the scan is">{Math.round(item.confidence * 100)}%</span>
          </div>
          {earliest && <p className="text-xs text-subtle">Earliest photo {new Date(earliest).toLocaleDateString()}</p>}

          {!selecting && (
            <div className="mt-auto flex items-center gap-1 pt-1">
              <Button size="sm" variant={item.user_confirmed ? "success" : "secondary"}
                onClick={() => onPatch({ user_confirmed: !item.user_confirmed })}>
                <Check className="size-3.5" strokeWidth={3} aria-hidden /> {item.user_confirmed ? "Confirmed" : "I owned this"}
              </Button>
              {editing ? (
                <Button size="sm" variant="ghost" onClick={save}>Save</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label="Edit"><Pencil className="size-3.5" /></Button>
              )}
              {photoCount > 1 && (
                <Button size="sm" variant="ghost" onClick={onSplit} title="Not the same item? Split it back into separate listings" aria-label="Split">
                  <Split className="size-3.5" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onRemove} className="ml-auto hover:text-danger" aria-label="Remove">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function PhotoViewer({ item, metaById, photoUrl, onClose }: {
  item: InventoryItem; metaById: Record<string, PhotoMeta>; photoUrl: (pid: string) => string; onClose: () => void;
}) {
  const evidence = item.photos.filter((p) => metaById[p.photo_id]);
  const [index, setIndex] = useState(0);
  const ev = evidence[Math.min(index, evidence.length - 1)];
  if (!ev) return null;
  const meta = metaById[ev.photo_id];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <motion.div initial={{ scale: 0.97, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97 }}
        onClick={(e) => e.stopPropagation()} className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-surface shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold capitalize">{item.category}</p>
            <p className="text-xs text-muted">
              Evidence photo {index + 1} of {evidence.length}
              {ev.taken_at ? ` · taken ${new Date(ev.taken_at).toLocaleDateString()}` : " · no date on this photo"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close"><X className="size-4" /></Button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto bg-canvas">
          <PhotoWithMasks src={photoUrl(meta.photo_id)} meta={meta} items={[item]} fit />
          {evidence.length > 1 && (
            <>
              <button onClick={() => setIndex((i) => (i - 1 + evidence.length) % evidence.length)} aria-label="Previous photo"
                className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface shadow-pop">
                <ChevronLeft className="size-5" />
              </button>
              <button onClick={() => setIndex((i) => (i + 1) % evidence.length)} aria-label="Next photo"
                className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface shadow-pop">
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>
        {!ev.taken_at && (
          <p className="border-t border-line px-4 py-2.5 text-xs text-muted">
            A dated photo or a receipt is stronger evidence. Check your email for order confirmations.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
