"use client";

import { Bookmark, ChevronDown, ExternalLink, FolderCheck } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { CATEGORY_LABELS, type AidPreparation, type AidProgram, type AidSituation } from "@/lib/aidAutopilot";
import { Preparation } from "./Preparation";

export function ResourceCard({ program: p, open, onToggle, preparing, onPrepare, situation, prep, onChange, onAsk }: {
  program: AidProgram; open: boolean; onToggle: () => void; preparing: boolean; onPrepare: () => void;
  situation: AidSituation; prep: AidPreparation; onChange: (p: AidPreparation) => void; onAsk: () => void;
}) {
  const checked = new Date(`${p.source.checkedAt}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return <Card className={`aid-resource p-5 sm:p-7 ${open ? "aid-resource-open" : ""}`} data-aid-program={p.id}>
    <div className="flex items-start gap-3">
      <button onClick={onToggle} aria-expanded={open} aria-controls={`aid-details-${p.id}`} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-soft text-blue"><FolderCheck className="size-5" aria-hidden /></span>
        <span className="min-w-0 flex-1"><span className="mb-1 block text-xs font-medium text-muted">{CATEGORY_LABELS[p.category]}</span><span className="block font-display text-xl font-bold sm:text-2xl">{p.name}</span><span className="mt-2 block text-sm text-muted">{p.description}</span></span>
        <ChevronDown className={`mt-3 size-5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <button onClick={() => onChange({ ...prep, saved: !prep.saved })} aria-label={`${prep.saved ? "Unsave" : "Save"} ${p.name} link`} aria-pressed={prep.saved} className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2 print:hidden"><Bookmark className="size-4" fill={prep.saved ? "currentColor" : "none"} aria-hidden /></button>
    </div>
    <div className="mt-5 flex flex-wrap gap-2"><Badge tone="warn">Eligibility needs checking</Badge><Badge>Demo record</Badge></div>
    <p className="mt-3 text-sm"><span className="font-semibold">Check first: </span>{p.eligibility[0]}</p>
    <p className="mt-2 text-xs text-muted">Prepare: {p.documents[0]}. <button onClick={onToggle} className="min-h-11 font-semibold text-blue underline">{open ? "Hide details" : "See requirements & documents"}</button></p>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
      <a href={p.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-blue hover:underline">{p.source.name}<ExternalLink className="size-3 shrink-0" aria-hidden /></a>
      <span>Source reviewed {checked}<span className="block">Local availability not verified</span></span>
    </div>
    {open && <div id={`aid-details-${p.id}`} className="mt-5 border-t border-line pt-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div><h3 className="text-lg">Who may qualify</h3><ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted">{p.eligibility.map((s) => <li key={s}>{s}</li>)}</ul></div>
        <div><h3 className="text-lg">Documents to prepare</h3><ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted">{p.documents.map((s) => <li key={s}>{s}</li>)}</ul></div>
      </div>
      <div className="my-6 rounded-2xl bg-accent-soft p-4 text-sm"><h3 className="mb-2 text-base">Before you apply</h3><ul className="list-disc space-y-2 pl-4 text-muted">{p.limitations.map((s) => <li key={s}>{s}</li>)}</ul></div>
      <div className="flex flex-wrap gap-3 print:hidden">
        <a href={p.applicationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink px-5 text-sm font-semibold hover:bg-surface-2">{p.applicationLabel}<ExternalLink className="size-4" aria-hidden /></a>
        {!preparing && <Button variant="primary" onClick={onPrepare}>Help me prepare<FolderCheck className="size-4" aria-hidden /></Button>}
      </div>
      {preparing && <Preparation program={p} situation={situation} prep={prep} onChange={onChange} onAsk={onAsk} />}
    </div>}
  </Card>;
}
