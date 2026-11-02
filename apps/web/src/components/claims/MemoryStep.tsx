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
const PILL_H = 42;
const HUB_R = 64;
const GRADE_LABEL: Record<EvidenceGrade["grade"], string> = { strong: "Strong evidence", fair: "Fair evidence", weak: "Weak evidence" };

// "hub" is the "Your home" centre: drawn only, linked to every room.
type Kind = "hub" | "room" | "item" | "suggestion";

// "Did you own a lamp / an alarm clock / any bed sheets?"
function ownQuestion(name: string) {
  const article = /s$/.test(name) && !/ss$/.test(name) ? "any" : /^[aeiou]/i.test(name) ? "an" : "a";
  return `Did you own ${article} ${name}?`;
}
interface Node extends SimulationNodeDatum { id: string; kind: Kind; label: string }
type Link = SimulationLinkDatum<Node> & { kind: "home" | "owns" | "suggests" };
type Selection = { kind: Kind; id: string } | null;
type AskState = { status: "idle" } | { status: "checking" } | { status: "found"; item: InventoryItem } | { status: "error"; error: string };

// Nodes are pills; half their width comes from the label length (used for spacing and clamping).
function halfWidth(n: Pick<Node, "kind" | "label">) {
  if (n.kind === "hub") return HUB_R;
  return Math.min(96, Math.round(n.label.length * 3.9) + (n.kind === "room" ? 34 : 30));
}

function layout(nodes: Node[], links: Link[]) {
  // Run the physics once, synchronously: the graph appears settled rather than wobbling.
  const sim = forceSimulation(nodes)
    .force("link", forceLink<Node, Link>(links).id((d) => d.id).distance((l) => (l.kind === "home" ? 150 : l.kind === "owns" ? 110 : 95)).strength(0.7))
    .force("charge", forceManyBody().strength(-320))
    .force("center", forceCenter(W / 2, H / 2))
    .force("x", forceX(W / 2).strength(0.04))
    .force("y", forceY(H / 2).strength(0.07))
    .force("collide", forceCollide<Node>((d) => halfWidth(d) + 10))
    .stop();
  for (let i = 0; i < 320; i++) sim.tick();
  for (const n of nodes) {
    const hw = halfWidth(n), hh = n.kind === "hub" ? HUB_R : PILL_H / 2;
    n.x = Math.max(hw + 8, Math.min(W - hw - 8, n.x ?? W / 2));
    n.y = Math.max(hh + 8, Math.min(H - hh - 8, n.y ?? H / 2));
  }
}

export function MemoryStep({ session, onExport }: { session: ClaimSession; onExport: () => void }) {
  const { memory, loadMemoryWeb, items, photos } = session;
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
    const nodes: Node[] = [{ id: "__home", kind: "hub", label: "Your home", fx: W / 2, fy: H / 2 }];
    const links: Link[] = [];
    for (const room of web.rooms) {
      nodes.push({ id: room.id, kind: "room", label: room.name });
      links.push({ source: "__home", target: room.id, kind: "home" });
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
        <Card className="memory-graph">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="group"
            aria-label={`Memory web: ${web.rooms.length} rooms and ${suggestionsLeft} suggestions`}>
            {graph.links.map((l, i) => (
              <line key={i} x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y}
                stroke={l.kind === "suggests" ? "var(--line-strong)" : "var(--ink)"} strokeWidth={l.kind === "home" ? 1.75 : 1.25}
                strokeDasharray={l.kind === "suggests" ? "4 4" : undefined} opacity={l.kind === "suggests" ? 0.9 : 0.55} />
            ))}
            {graph.nodes.map((n, i) => {
              const on = selected?.id === n.id;
              if (n.kind === "hub") return <HubNode key={n.id} x={n.x ?? 0} y={n.y ?? 0} />;
              return (
                <motion.g key={n.id} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i, 24) * 0.03, type: "spring", stiffness: 260, damping: 20 }}
                  style={{ x: n.x, y: n.y, cursor: "pointer" }}
                  onClick={() => setSelected(on ? null : { kind: n.kind, id: n.id })}
                  role="button" tabIndex={0} aria-pressed={on}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(on ? null : { kind: n.kind, id: n.id }); } }}
                  aria-label={n.kind === "suggestion" ? ownQuestion(n.label) : n.label}>
                  {n.kind === "room" && <RoomNode node={n} on={on} />}
                  {n.kind === "item" && items[n.id] && <ItemNode node={n} on={on} isNew={Object.values(added).includes(n.id)} />}
                  {n.kind === "suggestion" && <SuggestionNode node={n} on={on} />}
                </motion.g>
              );
            })}
          </svg>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full border border-ink" /> Room</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full bg-accent" /> Confirmed item</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full border border-dashed border-line-strong" /> Did you own this?</span>
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
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

// Node renderers: a black "Your home" hub, outlined room pills, coral confirmed-item pills with a
// check, and dashed "?" pills for suggestions. The selected node gets a thicker ink outline.
function Pill({ node, fill, stroke, text, dashed = false, on, children }: {
  node: Node; fill: string; stroke: string; text: string; dashed?: boolean; on: boolean; children: React.ReactNode;
}) {
  const hw = halfWidth(node);
  return (
    <>
      <rect x={-hw} y={-PILL_H / 2} width={hw * 2} height={PILL_H} rx={PILL_H / 2} fill={fill}
        stroke={on ? "var(--ink)" : stroke} strokeWidth={on ? 2.5 : 1.25} strokeDasharray={dashed && !on ? "4 3" : undefined} />
      <text textAnchor="middle" dy="0.35em" fontSize={13} fontWeight={600} fill={text}>{children}</text>
    </>
  );
}

function HubNode({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle r={HUB_R} fill="var(--primary)" />
      <path d="M-11 -6 L0 -15 L11 -6 V6 H-11 Z" transform="translate(0 -6) scale(1.3)" fill="none" stroke="var(--primary-ink)" strokeWidth={2.2} strokeLinejoin="round" />
      <text textAnchor="middle" y={29} fontSize={15} fontWeight={700} fill="var(--primary-ink)">Your home</text>
    </g>
  );
}

function RoomNode({ node, on }: { node: Node; on: boolean }) {
  return <Pill node={node} fill="var(--surface)" stroke="var(--ink)" text="var(--ink)" on={on}>{node.label}</Pill>;
}

function ItemNode({ node, on, isNew }: { node: Node; on: boolean; isNew: boolean }) {
  return (
    <Pill node={node} fill={isNew ? "var(--good)" : "var(--accent)"} stroke="transparent" text={isNew ? "var(--good-ink)" : "var(--accent-ink)"} on={on}>
      <tspan className="capitalize">{node.label}</tspan> {"\u2713"}
    </Pill>
  );
}

function SuggestionNode({ node, on }: { node: Node; on: boolean }) {
  return (
    <Pill node={node} fill={on ? "var(--accent-soft)" : "var(--surface)"} stroke="var(--line-strong)" text="var(--muted)" dashed on={on}>
      {node.label} ?
    </Pill>
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
      <h3 className="flex-1 text-2xl first-letter:uppercase">{title}</h3>
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
          <ItemCrop src={session.photoUrl(meta.photo_id)} meta={meta} mask={item.photos[0]?.mask ?? null} color="var(--accent)" />
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
            <ItemCrop src={session.photoUrl(meta.photo_id)} meta={meta} mask={item.photos[0]?.mask ?? null} color="var(--good)" />
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
      <div className="flex gap-2">
        <Button variant="primary" className="flex-1" onClick={() => fileRef.current?.click()}>
          <Check className="size-4" aria-hidden /> {state.status === "error" ? "Try another photo" : "Yes, add it"}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onDismiss}>No</Button>
      </div>
      <p className="mt-1 text-sm font-semibold">Add photo evidence</p>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted hover:bg-surface-2">
        <ImagePlus className="size-5 text-ink" aria-hidden />
        <span className="font-semibold text-ink">Upload a photo</span>
        <span className="text-xs">One that shows the {s.name}. JPG, PNG or HEIC.</span>
      </button>
    </div>
  );
}
