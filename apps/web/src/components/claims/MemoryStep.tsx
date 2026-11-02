"use client";

// Step 4: the memory web. Rooms, confirmed items and "did you own this?" prompts for things
// people often forget. A prompt only becomes an item when the user adds a photo in which the
// item is found, and then confirms it. Each item shows how well it is proven.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import { ArrowRight, Check, CircleHelp, ImagePlus, Lightbulb, RefreshCw, X } from "lucide-react";
import type { EvidenceGrade, InventoryItem, MemorySuggestion, PhotoMeta } from "@shared/types";
import type { ClaimSession } from "@/lib/useClaimSession";
import { ItemCrop } from "@/components/PhotoWithMasks";
import { WrenAvatar } from "@/components/Wren";
import { Badge, Button, Card, EmptyState, Notice } from "@/components/ui";

const W = 900;
const H = 560;
const R = { room: 36, item: 26, suggestion: 19 };
const GRADE_COLOR: Record<EvidenceGrade["grade"], string> = { strong: "#9dbb98", fair: "#e3a548", weak: "#9a9184" };
const GRADE_LABEL: Record<EvidenceGrade["grade"], string> = { strong: "Strong evidence", fair: "Fair evidence", weak: "Weak evidence" };

type Kind = "room" | "item" | "suggestion";

// "Did you own a lamp / an alarm clock / any bed sheets?"
function ownQuestion(name: string) {
  const article = /s$/.test(name) && !/ss$/.test(name) ? "any" : /^[aeiou]/i.test(name) ? "an" : "a";
  return `Did you own ${article} ${name}?`;
}
interface Node extends SimulationNodeDatum { id: string; kind: Kind; label: string }
type Link = SimulationLinkDatum<Node> & { kind: "owns" | "suggests" };
type Selection = { kind: Kind; id: string } | null;
type AskState = { status: "idle" } | { status: "checking" } | { status: "found"; item: InventoryItem } | { status: "error"; error: string };

function layout(nodes: Node[], links: Link[]) {
  // Run the physics once, synchronously: the graph appears settled rather than wobbling.
  const sim = forceSimulation(nodes)
    .force("link", forceLink<Node, Link>(links).id((d) => d.id).distance((l) => (l.kind === "owns" ? 95 : 80)).strength(0.7))
    .force("charge", forceManyBody().strength(-320))
    .force("center", forceCenter(W / 2, H / 2))
    .force("x", forceX(W / 2).strength(0.04))
    .force("y", forceY(H / 2).strength(0.07))
    .force("collide", forceCollide<Node>((d) => R[d.kind] + 22))
    .stop();
  for (let i = 0; i < 320; i++) sim.tick();
  for (const n of nodes) {
    n.x = Math.max(R[n.kind] + 10, Math.min(W - R[n.kind] - 10, n.x ?? W / 2));
    n.y = Math.max(R[n.kind] + 10, Math.min(H - R[n.kind] - 28, n.y ?? H / 2));
  }
}

export function MemoryStep({ session, onExport }: { session: ClaimSession; onExport: () => void }) {
  const { memory, loadMemoryWeb, items, photos, photoUrl } = session;
  const [selected, setSelected] = useState<Selection>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Record<string, string>>({}); // suggestion id -> new item id

  useEffect(() => {
    if (memory.status === "idle") loadMemoryWeb();
  }, [memory.status, loadMemoryWeb]);

  const metaById = useMemo(() => {
    const m: Record<string, PhotoMeta> = {};
    photos.forEach((p) => p.meta && (m[p.meta.photo_id] = p.meta));
    return m;
  }, [photos]);

  const web = memory.status === "done" ? memory.web : null;

  const graph = useMemo(() => {
    if (!web) return null;
    const nodes: Node[] = [];
    const links: Link[] = [];
    for (const room of web.rooms) {
      nodes.push({ id: room.id, kind: "room", label: room.name });
      for (const iid of room.item_ids) {
        if (!items[iid]) continue;
        nodes.push({ id: iid, kind: "item", label: items[iid].category });
        links.push({ source: room.id, target: iid, kind: "owns" });
      }
    }
    const ids = new Set(nodes.map((n) => n.id));
    for (const s of web.suggestions) {
      if (dismissed.has(s.id)) continue;
      const newItem = added[s.id] ? items[added[s.id]] : undefined;
      const node: Node = newItem ? { id: newItem.id, kind: "item", label: newItem.category } : { id: s.id, kind: "suggestion", label: s.name };
      nodes.push(node);
      ids.add(node.id);
      const anchors = s.related_item_ids.filter((i) => ids.has(i));
      if (newItem || !anchors.length) links.push({ source: s.room_id, target: node.id, kind: newItem ? "owns" : "suggests" });
      anchors.forEach((a) => !newItem && links.push({ source: a, target: node.id, kind: "suggests" }));
    }
    const valid = links.filter((l) => ids.has(l.source as string) && ids.has(l.target as string));
    layout(nodes, valid);
    return { nodes, links: valid as (Link & { source: Node; target: Node })[] };
  }, [web, items, dismissed, added]);

  const suggestionsLeft = web ? web.suggestions.filter((s) => !dismissed.has(s.id) && !added[s.id]).length : 0;

  if (memory.status === "loading" || memory.status === "idle") {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <WrenAvatar mood="searching" size={96} />
        <p className="font-semibold">Wren is looking for things you might have forgotten…</p>
        <p className="max-w-md text-sm text-muted">Using the items you confirmed to suggest related belongings people often own.</p>
      </Card>
    );
  }
  if (memory.status === "error") {
    return (
      <Card className="p-5">
        <Notice tone="warn">Couldn’t build the memory web ({memory.error}). <button className="font-semibold underline" onClick={loadMemoryWeb}>Try again</button></Notice>
      </Card>
    );
  }
  if (!web || !graph || graph.nodes.length === 0) {
    return (
      <Card>
        <EmptyState icon={<CircleHelp className="size-5" />} title="Confirm some items first"
          body="The memory web starts from the items you’ve confirmed in Review." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <WrenAvatar mood="idle" size={56} />
        <div className="min-w-60 flex-1">
          <p className="font-semibold">Did you forget anything?</p>
          <p className="mt-0.5 text-sm text-muted">
            Wren suggests things people often own alongside what you confirmed. Nothing is added unless you add a photo
            that shows it and confirm it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setSelected(null); loadMemoryWeb(); }}>
            <RefreshCw className="size-4" aria-hidden /> Refresh
          </Button>
          <Button size="sm" variant="primary" onClick={onExport}>Continue to export <ArrowRight className="size-4" aria-hidden /></Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img"
            aria-label={`Memory web: ${web.rooms.length} rooms and ${suggestionsLeft} suggestions`}>
            <defs>
              {graph.nodes.filter((n) => n.kind === "item").map((n) => (
                <clipPath key={n.id} id={`clip-${n.id}`}><circle r={R.item} /></clipPath>
              ))}
            </defs>
            {graph.links.map((l, i) => (
              <line key={i} x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
                stroke={l.kind === "owns" ? "var(--line)" : "var(--accent)"} strokeWidth={l.kind === "owns" ? 2 : 1.5}
                strokeDasharray={l.kind === "suggests" ? "5 5" : undefined} opacity={l.kind === "suggests" ? 0.55 : 1} />
            ))}
            {graph.nodes.map((n, i) => {
              const on = selected?.id === n.id;
              return (
                <motion.g key={n.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i, 24) * 0.03, type: "spring", stiffness: 260, damping: 20 }}
                  style={{ x: n.x, y: n.y, cursor: "pointer" }}
                  onClick={() => setSelected(on ? null : { kind: n.kind, id: n.id })}
                  role="button" aria-label={n.kind === "suggestion" ? ownQuestion(n.label) : n.label}>
                  {n.kind === "room" && <RoomNode label={n.label} on={on} />}
                  {n.kind === "item" && items[n.id] && (
                    <ItemNode item={items[n.id]} meta={metaById[items[n.id].photos[0]?.photo_id]} src={photoUrl(items[n.id].photos[0]?.photo_id ?? "")}
                      grade={web.grades[n.id]?.grade} on={on} isNew={Object.values(added).includes(n.id)} />
                  )}
                  {n.kind === "suggestion" && <SuggestionNode label={n.label} on={on} />}
                </motion.g>
              );
            })}
          </svg>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-accent" /> Room</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-full border-2" style={{ borderColor: GRADE_COLOR.strong }} /> Item (ring = evidence)</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-full border-2 border-dashed border-accent" /> Did you own this?</span>
          </div>
        </Card>

        <Card className="p-4">
          <SidePanel selected={selected} session={session} web={web} metaById={metaById}
            onClose={() => setSelected(null)}
            onDismiss={(s) => { setDismissed((d) => new Set(d).add(s.id)); setSelected(null); }}
            onAdded={(s, item) => { setAdded((a) => ({ ...a, [s.id]: item.id })); setSelected({ kind: "item", id: item.id }); }}
            suggestionsLeft={suggestionsLeft} />
        </Card>
      </div>
    </div>
  );
}

// Room names on up to two lines so they fit inside the circle ("Living" / "room").
function roomLines(label: string) {
  const words = label.split(" ");
  if (words.length === 1) return [label.length > 10 ? `${label.slice(0, 9)}…` : label];
  const first = words[0];
  const rest = words.slice(1).join(" ");
  return [first.length > 10 ? `${first.slice(0, 9)}…` : first, rest.length > 10 ? `${rest.slice(0, 9)}…` : rest];
}

function RoomNode({ label, on }: { label: string; on: boolean }) {
  return (
    <>
      <circle r={R.room + (on ? 4 : 0)} fill="var(--accent)" stroke="var(--surface)" strokeWidth={4} />
      <text textAnchor="middle" fill="var(--accent-ink)" fontSize={12} fontWeight={700}>
        {roomLines(label).map((line, i, all) => (
          <tspan key={i} x={0} dy={i === 0 ? `${0.35 - (all.length - 1) * 0.55}em` : "1.1em"}>{line}</tspan>
        ))}
      </text>
    </>
  );
}

function ItemNode({ item, meta, src, grade, on, isNew }: {
  item: InventoryItem; meta?: PhotoMeta; src: string; grade?: EvidenceGrade["grade"]; on: boolean; isNew: boolean;
}) {
  const r = R.item + (on ? 3 : 0);
  return (
    <>
      <circle r={r + 4} fill={isNew ? "var(--good)" : grade ? GRADE_COLOR[grade] : "var(--line)"} />
      <g clipPath={`url(#clip-${item.id})`} transform={on ? "scale(1.12)" : undefined}>
        <circle r={R.item} fill="var(--surface-3)" />
        {meta && (
          <svg x={-R.item} y={-R.item} width={R.item * 2} height={R.item * 2} overflow="hidden">
            <ItemCrop src={src} meta={meta} mask={item.photos[0]?.mask ?? null} color="transparent" />
          </svg>
        )}
      </g>
      <text textAnchor="middle" y={r + 18} fontSize={12} fontWeight={600} fill="var(--ink)" className="capitalize">{item.category}</text>
    </>
  );
}

function SuggestionNode({ label, on }: { label: string; on: boolean }) {
  return (
    <>
      <circle r={R.suggestion + (on ? 3 : 0)} fill={on ? "var(--accent-soft)" : "var(--surface)"} stroke="var(--accent)"
        strokeWidth={2} strokeDasharray="4 3" />
      <text textAnchor="middle" dy="0.35em" fontSize={16} fontWeight={700} fill="var(--accent)">?</text>
      <text textAnchor="middle" y={R.suggestion + 16} fontSize={11.5} fill="var(--muted)">{label}</text>
    </>
  );
}

function SidePanel({ selected, session, web, metaById, onClose, onDismiss, onAdded, suggestionsLeft }: {
  selected: Selection;
  session: ClaimSession;
  web: NonNullable<Extract<ClaimSession["memory"], { status: "done" }>["web"]>;
  metaById: Record<string, PhotoMeta>;
  onClose: () => void;
  onDismiss: (s: MemorySuggestion) => void;
  onAdded: (s: MemorySuggestion, item: InventoryItem) => void;
  suggestionsLeft: number;
}) {
  if (!selected) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="font-semibold">How to use the memory web</p>
        <p className="text-muted">Tap a dashed <strong className="text-accent">?</strong> to answer “did you own this?”. Tap an item to see how well it’s proven and how to make the evidence stronger.</p>
        <p className="text-muted"><strong className="text-ink">{suggestionsLeft}</strong> suggestion{suggestionsLeft === 1 ? "" : "s"} left to review.</p>
      </div>
    );
  }
  const header = (title: string) => (
    <div className="mb-3 flex items-start gap-2">
      <p className="flex-1 font-semibold first-letter:uppercase">{title}</p>
      <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><X className="size-4" /></button>
    </div>
  );

  if (selected.kind === "room") {
    const room = web.rooms.find((r) => r.id === selected.id);
    return (
      <div>
        {header(room?.name ?? "Room")}
        <ul className="flex flex-col gap-1 text-sm">
          {room?.item_ids.map((iid) => session.items[iid] && <li key={iid} className="capitalize">{session.items[iid].category}</li>)}
        </ul>
      </div>
    );
  }
  if (selected.kind === "suggestion") {
    const s = web.suggestions.find((x) => x.id === selected.id);
    if (!s) return null;
    return <AskPanel key={s.id} suggestion={s} session={session} metaById={metaById} header={header}
      onDismiss={() => onDismiss(s)} onAdded={(item) => onAdded(s, item)} />;
  }
  const item = session.items[selected.id];
  if (!item) return null;
  const meta = metaById[item.photos[0]?.photo_id];
  const g = web.grades[item.id] ?? null;
  return (
    <div>
      {header(item.category)}
      {meta && (
        <div className="mb-3 h-36 overflow-hidden rounded-lg">
          <ItemCrop src={session.photoUrl(meta.photo_id)} meta={meta} mask={item.photos[0]?.mask ?? null} color="#e3a548" />
        </div>
      )}
      {g ? <GradeView grade={g} /> : <Notice tone="good" icon={<Check className="size-4" />}>Just added from your photo. Its grade updates on refresh.</Notice>}
      {!item.user_confirmed && (
        <Button className="mt-3 w-full" variant="success" onClick={() => session.patchItem(item.id, { user_confirmed: true })}>
          <Check className="size-4" strokeWidth={3} aria-hidden /> I owned this
        </Button>
      )}
    </div>
  );
}

function GradeView({ grade: g }: { grade: EvidenceGrade }) {
  const rows: [string, boolean][] = [
    ["Dated photo", g.has_dated_photo],
    [`Seen in ${g.photo_count} photo${g.photo_count === 1 ? "" : "s"}`, g.photo_count >= 2],
    ["Brand or model visible", g.has_brand],
    ["Receipt", g.has_receipt],
  ];
  return (
    <div className="flex flex-col gap-3 text-sm">
      <Badge tone={g.grade === "strong" ? "good" : g.grade === "fair" ? "warn" : "neutral"}>{GRADE_LABEL[g.grade]}</Badge>
      <ul className="flex flex-col gap-1.5">
        {rows.map(([label, ok]) => (
          <li key={label} className="flex items-center gap-2">
            {ok ? <Check className="size-4 text-good" strokeWidth={3} aria-hidden /> : <X className="size-4 text-subtle" aria-hidden />}
            <span className={ok ? "" : "text-muted"}>{label}</span>
          </li>
        ))}
      </ul>
      <div className="rounded-lg bg-surface-2 p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"><Lightbulb className="size-3.5 text-warn" aria-hidden /> Make it stronger</p>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted">{g.tips.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
    </div>
  );
}

function AskPanel({ suggestion: s, session, metaById, header, onDismiss, onAdded }: {
  suggestion: MemorySuggestion;
  session: ClaimSession;
  metaById: Record<string, PhotoMeta>;
  header: (title: string) => React.ReactNode;
  onDismiss: () => void;
  onAdded: (item: InventoryItem) => void;
}) {
  const [state, setState] = useState<AskState>({ status: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setState({ status: "checking" });
    try {
      const item = await session.addFromPhoto(file, s.name);
      setState({ status: "found", item });
    } catch (e) {
      setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (state.status === "checking") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <WrenAvatar mood="searching" size={88} />
        <p className="text-sm font-semibold">Looking for the {s.name} in your photo…</p>
      </div>
    );
  }
  if (state.status === "found") {
    const item = session.items[state.item.id] ?? state.item;
    const meta = metaById[item.photos[0]?.photo_id];
    return (
      <div className="flex flex-col gap-3">
        {header(`Found: ${s.name}`)}
        {meta && (
          <div className="h-40 overflow-hidden rounded-lg">
            <ItemCrop src={session.photoUrl(meta.photo_id)} meta={meta} mask={item.photos[0]?.mask ?? null} color="#9dbb98" />
          </div>
        )}
        <p className="text-sm text-muted">Is this your {s.name}? Confirm it to add it to your claim.</p>
        <Button variant="success" onClick={() => { session.patchItem(item.id, { user_confirmed: true }); onAdded(item); }}>
          <Check className="size-4" strokeWidth={3} aria-hidden /> Yes, I owned this
        </Button>
        <Button variant="ghost" onClick={() => { session.removeItem(item.id); setState({ status: "idle" }); }}>Not mine, remove it</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {header(ownQuestion(s.name))}
      <p className="text-sm text-muted">{s.reason}</p>
      <div className="rounded-lg bg-surface-2 p-3 text-xs">
        <p className="font-semibold">Where to find proof</p>
        <p className="mt-0.5 text-muted">{s.proof_hint}</p>
      </div>
      {state.status === "error" && <Notice tone="warn">{state.error}</Notice>}
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" className="hidden"
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <Button variant="primary" onClick={() => fileRef.current?.click()}>
        <ImagePlus className="size-4" aria-hidden /> {state.status === "error" ? "Try another photo" : "Yes, add a photo of it"}
      </Button>
      <Button variant="ghost" onClick={onDismiss}>No, I didn’t own one</Button>
    </div>
  );
}
