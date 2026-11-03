"use client";

// Step 4: the memory web. Rooms, confirmed items and "did you own this?" prompts for things
// people often forget. A prompt only becomes an item when the user adds a photo in which the
// item is found, and then confirms it. Each item shows how well it is proven.

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CircleHelp, ImagePlus, Lightbulb, RefreshCw, X } from "lucide-react";
import type { EvidenceGrade, InventoryItem, MemorySuggestion, PhotoMeta } from "@shared/types";
import type { ClaimSession } from "@/lib/useClaimSession";
import { ItemCrop } from "@/components/PhotoWithMasks";
import { WrenAvatar } from "@/components/Wren";
import { Badge, Button, Card, EmptyState, Notice } from "@/components/ui";
import { MemoryGraph } from "./MemoryGraph";
import type { GraphSelection } from "@/lib/memoryGraph";
import brand from "@shared/brand.json";

const GRADE_LABEL: Record<EvidenceGrade["grade"], string> = { strong: "Strong evidence", fair: "Fair evidence", weak: "Weak evidence" };

type Selection = GraphSelection | null;

// "Did you own a lamp / an alarm clock / any bed sheets?"
function ownQuestion(name: string) {
  const article = /s$/.test(name) && !/ss$/.test(name) ? "any" : /^[aeiou]/i.test(name) ? "an" : "a";
  return `Did you own ${article} ${name}?`;
}
type AskState = { status: "idle" } | { status: "checking" } | { status: "found"; item: InventoryItem; confirmError?: string } | { status: "error"; error: string };

export function MemoryStep({ session, onExport, onBack }: { session: ClaimSession; onExport: () => void; onBack?: () => void }) {
  const { memory, loadMemoryWeb, items, photos } = session;
  const [selected, setSelected] = useState<Selection>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Record<string, string>>({}); // suggestion id -> new item id
  const hasConfirmed = Object.values(items).some((item) => item.user_confirmed);

  useEffect(() => {
    if (hasConfirmed && memory.status === "idle") loadMemoryWeb();
  }, [memory.status, loadMemoryWeb, hasConfirmed]);

  const metaById = useMemo(() => {
    const m: Record<string, PhotoMeta> = {};
    photos.forEach((p) => p.meta && (m[p.meta.photo_id] = p.meta));
    return m;
  }, [photos]);

  const web = memory.status === "done" ? memory.web : memory.status === "loading" || memory.status === "error" ? memory.previous ?? null : null;

  const suggestionsLeft = web ? web.suggestions.filter((s) => !dismissed.has(s.id) && !items[added[s.id]]?.user_confirmed).length : 0;

  if (!hasConfirmed) return <Card><EmptyState icon={<CircleHelp className="size-5" />} title="Start with something you remember" body="Your Memory Web grows from confirmed belongings. Choose photos or review your inventory to add your first item." action={onBack ? <Button variant="primary" onClick={onBack}>{Object.keys(items).length ? "Review inventory" : "Choose photos"}<ArrowRight className="size-4" aria-hidden /></Button> : undefined} /></Card>;

  if (!web && (memory.status === "loading" || memory.status === "idle")) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <WrenAvatar mood="searching" size={96} />
        <p className="font-semibold">{brand.agentName} is looking for things you might have forgotten…</p>
        <p className="max-w-md text-sm text-muted">Using the items you confirmed to suggest related belongings people often own.</p>
      </Card>
    );
  }
  if (!web && memory.status === "error") {
    return (
      <Card className="p-5">
        <Notice tone="warn">Couldn’t build the memory web ({memory.error}). <button className="font-semibold underline" onClick={loadMemoryWeb}>Try again</button></Notice>
      </Card>
    );
  }
  if (!web || !Object.values(items).some((item) => item.user_confirmed)) {
    return (
      <Card>
        <EmptyState icon={<CircleHelp className="size-5" />} title="Confirm some items first"
          body="The memory web starts from the items you’ve confirmed in Review." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {memory.status === "error" && <Notice tone="warn">The refresh couldn’t finish ({memory.error}). Your current graph is still available. <button className="font-semibold underline" onClick={loadMemoryWeb}>Try again</button></Notice>}
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <WrenAvatar mood="idle" size={56} />
        <div className="min-w-60 flex-1">
          <p className="font-semibold">Did you forget anything?</p>
          <p className="mt-0.5 text-sm text-muted">
            {brand.agentName} suggests things people often own alongside what you confirmed. Nothing is added unless you add a photo
            that shows it and confirm it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" loading={memory.status === "loading"} onClick={() => { loadMemoryWeb(); }}>
            <RefreshCw className="size-4" aria-hidden /> Refresh
          </Button>
          <Button size="sm" variant="primary" onClick={onExport}>Continue to export <ArrowRight className="size-4" aria-hidden /></Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <MemoryGraph web={web} items={items} dismissed={dismissed} added={added} selected={selected} onSelect={setSelected} />

        <Card className="self-start p-6 sm:p-7 lg:sticky lg:top-24" data-memory-details role="region" aria-label="Belonging details" aria-live="polite">
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

  if (selected.kind === "hub") {
    return <div>{header("Your home")}<p className="text-sm text-muted">{Object.values(session.items).filter((item) => item.user_confirmed).length} confirmed belongings across {web.rooms.length} rooms.</p><p className="mt-3 text-sm text-muted">Select a room to explore its belongings, or choose a dashed suggestion to add photo evidence. Suggestions never enter your claim automatically.</p></div>;
  }

  if (selected.kind === "room") {
    const room = web.rooms.find((r) => r.id === selected.id);
    return (
      <div>
        {header(room?.name ?? "Room")}
        <ul className="flex flex-col gap-1 text-sm">
          {room?.item_ids.map((iid) => session.items[iid]?.user_confirmed && <li key={iid} className="capitalize">{session.items[iid].category}</li>)}
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
  const [confirming, setConfirming] = useState(false);
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
        {state.confirmError && <Notice tone="warn">{state.confirmError}</Notice>}
        <Button variant="success" loading={confirming} onClick={async () => {
          setConfirming(true);
          const saved = await session.patchItem(item.id, { user_confirmed: true });
          setConfirming(false);
          if (saved?.user_confirmed) onAdded(saved);
          else setState({ status: "found", item, confirmError: "Confirmation couldn’t be saved. Please try again; the suggestion has not been marked as confirmed." });
        }}>
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
