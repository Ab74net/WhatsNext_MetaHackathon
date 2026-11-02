"use client";

import { Download, Printer, Bookmark, MessageCircle } from "lucide-react";
import brand from "@shared/brand.json";
import { Button, Notice } from "@/components/ui";
import { describeSituation, preparationSummary, type AidPreparation, type AidProgram, type AidSituation } from "@/lib/aidAutopilot";

export function Preparation({ program, situation, prep, onChange, onAsk }: { program: AidProgram; situation: AidSituation; prep: AidPreparation; onChange: (p: AidPreparation) => void; onAsk: () => void }) {
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(preparationSummary(program, situation, prep), null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `aid-preparation-${program.id}.json`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="aid-preparation mt-7 border-t border-line pt-7" aria-labelledby={`prep-${program.id}`}>
    <p className="mb-5 hidden text-sm print:block">Situation: {describeSituation(situation).join(" · ")}</p>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h3 id={`prep-${program.id}`} className="text-2xl">Your preparation checklist</h3><p className="mt-2 text-sm text-muted">Optional prompts to prepare for the provider. Keep documents with you; upload nothing here.</p></div>
      <Button onClick={() => onChange({ ...prep, saved: !prep.saved })} aria-pressed={prep.saved} size="sm"><Bookmark className="size-4" fill={prep.saved ? "currentColor" : "none"} aria-hidden />{prep.saved ? "Link saved" : "Save link"}</Button>
    </div>
    <div className="mb-5 flex flex-col gap-2">{program.documents.map((name, i) => <label key={name} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl bg-surface-2 px-4 py-3 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={prep.collected.includes(name)} onChange={(e) => onChange({ ...prep, collected: e.target.checked ? [...prep.collected, name] : prep.collected.filter((d) => d !== name) })} />
      <span className={prep.collected.includes(name) ? "text-muted line-through" : ""}>{name}</span><span className="sr-only">Document {i + 1}</span>
    </label>)}</div>
    <label className="mb-5 block text-sm font-semibold">Application status <span className="font-normal text-muted">(your own tracking)</span>
      <select value={prep.status} onChange={(e) => onChange({ ...prep, status: e.target.value as AidPreparation["status"] })} className="mt-2 block min-h-12 w-full rounded-xl border bg-surface px-3 text-sm font-normal">
        {["Not started", "Preparing", "Submitted"].map((status) => <option key={status}>{status}</option>)}
      </select>
    </label>
    <p className="-mt-3 mb-5 text-xs text-muted">{prep.status === "Submitted" ? "You marked this as submitted outside this app. We have not submitted or verified an application." : "Completing this checklist never submits an application or changes your status automatically."}</p>
    <label className="block text-sm font-semibold">Your notes <span className="font-normal text-muted">(optional)</span>
      <textarea rows={4} maxLength={3000} value={prep.notes} onChange={(e) => onChange({ ...prep, notes: e.target.value })} placeholder="Questions to ask, or what you want to do next. Avoid ID, account, or policy numbers." className="mt-2 block w-full resize-y rounded-xl border bg-surface p-3 text-sm font-normal print:hidden" />
      <span className="mt-2 hidden whitespace-pre-wrap font-normal print:block">{prep.notes || "No notes added."}</span>
    </label>
    <p className="mb-5 mt-2 text-xs text-muted">Notes stay in memory until you reload or clear this page. They are not sent to {brand.agentName}. A downloaded summary includes them.</p>
    {prep.saved && <p className="mb-5 break-words text-sm"><span className="font-semibold">Saved application link: </span><a href={program.applicationUrl} target="_blank" rel="noopener noreferrer" className="text-blue underline">{program.applicationUrl}</a></p>}
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button onClick={download} variant="primary"><Download className="size-4" aria-hidden />Download JSON</Button>
      <Button onClick={() => window.print()}><Printer className="size-4" aria-hidden />Print preparation</Button>
      <Button onClick={onAsk} variant="ghost"><MessageCircle className="size-4" aria-hidden />Ask {brand.agentName}</Button>
    </div>
    <div className="mt-5"><Notice>Demo resource. Eligibility and local availability are not verified. No application has been submitted by this app.</Notice></div>
  </section>;
}
