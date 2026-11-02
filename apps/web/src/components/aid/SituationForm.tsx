"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Button, Card, ProgressBar } from "@/components/ui";
import { describeSituation, NEED_LABELS, type AidDisaster, type AidNeed, type AidSituation } from "@/lib/aidAutopilot";

const QUESTIONS = ["What type of disaster affected you?", "Where did it happen?", "Do you rent or own your home?", "What do you need help with right now?", "Have you already applied for assistance?", "Does this look right?"];
const DISASTERS: [AidDisaster, string][] = [["flood", "Flood"], ["wildfire", "Wildfire"], ["hurricane", "Hurricane"], ["tornado", "Tornado"], ["earthquake", "Earthquake"], ["other", "Something else"]];

export function SituationForm({ initial, onCancel, onComplete }: { initial: AidSituation; onCancel: () => void; onComplete: (s: AidSituation) => void }) {
  const [draft, setDraft] = useState<AidSituation>({ ...initial, needs: [...initial.needs] });
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  function go(next: number) { setStep(next); requestAnimationFrame(() => heading.current?.focus()); }
  const radioClass = "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-line p-4 text-sm font-medium has-checked:border-ink has-checked:bg-blue-soft";
  return (
    <Card className="mx-auto w-full max-w-3xl p-6 sm:p-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <span className="page-eyebrow">Your situation · {step < 5 ? `Question ${step + 1} of 5` : "Review"}</span>
        <button type="button" onClick={onCancel} aria-label="Close questionnaire" className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2"><X className="size-5" aria-hidden /></button>
      </div>
      <ProgressBar value={(step + 1) / 6} />
      <h2 ref={heading} tabIndex={-1} className="mb-3 mt-8 text-3xl outline-none sm:text-4xl">{QUESTIONS[step]}</h2>
      <p className="mb-7 text-sm text-muted">{step === 5 ? "Confirm the details you want to use. These answers narrow demo resources; they do not determine eligibility." : "Every question is optional. Share only what feels useful; you can go back or skip."}</p>
      <form onSubmit={(e) => { e.preventDefault(); if (step === 5) onComplete(draft); else go(step + 1); }}>
        <fieldset className="min-w-0">
          <legend className="sr-only">{QUESTIONS[step]}</legend>
          {step === 0 && <div className="grid gap-3 sm:grid-cols-2">{DISASTERS.map(([value, label]) => <label key={value} className={radioClass}><input type="radio" name="disaster" value={value} checked={draft.disaster === value} onChange={() => setDraft({ ...draft, disaster: value })} className="size-4" />{label}</label>)}</div>}
          {step === 1 && <div>
            <label htmlFor="aid-location" className="mb-2 block text-sm font-semibold">ZIP code or city/state <span className="font-normal text-muted">(optional)</span></label>
            <input id="aid-location" autoComplete="off" value={draft.location} maxLength={100} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="For example, Tampa, Florida or 33602" className="min-h-13 w-full rounded-xl border bg-surface px-4 text-base" />
            <p className="mt-3 text-xs text-muted">A street address isn’t needed. The demo does not geocode this field or check local program availability.</p>
          </div>}
          {step === 2 && <div className="grid gap-3 sm:grid-cols-3">{([["rent", "I rent"], ["own", "I own"], ["other", "Another situation"]] as const).map(([value, label]) => <label key={value} className={radioClass}><input type="radio" name="housing" checked={draft.housing === value} onChange={() => setDraft({ ...draft, housing: value })} className="size-4" />{label}</label>)}</div>}
          {step === 3 && <div className="grid gap-3 sm:grid-cols-2">{Object.entries(NEED_LABELS).map(([key, label]) => <label key={key} className={radioClass}><input type="checkbox" checked={draft.needs.includes(key as AidNeed)} onChange={(e) => setDraft({ ...draft, needs: e.target.checked ? [...draft.needs, key as AidNeed] : draft.needs.filter((n) => n !== key) })} className="size-4" />{label}</label>)}</div>}
          {step === 4 && <div className="grid gap-3">{([["no", "Not yet"], ["yes", "Yes, I’ve applied to at least one program"], ["unsure", "I’m not sure"]] as const).map(([value, label]) => <label key={value} className={radioClass}><input type="radio" name="applied" checked={draft.applied === value} onChange={() => setDraft({ ...draft, applied: value })} className="size-4" />{label}</label>)}</div>}
          {step === 5 && <div className="rounded-2xl border border-line bg-surface-2 p-5">
            <ul className="flex flex-col gap-3">{describeSituation(draft).map((s) => <li key={s} className="flex items-start gap-3 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-blue" aria-hidden />{s}</li>)}</ul>
            <p className="mt-4 border-t border-line pt-4 text-xs text-muted">Previous applications: {draft.applied === "yes" ? "Already applied" : draft.applied === "no" ? "Not yet" : draft.applied === "unsure" ? "Not sure" : "Not specified"}. No personal documents or photos are used.</p>
          </div>}
        </fieldset>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
          <Button type="button" variant="ghost" onClick={() => step ? go(step - 1) : onCancel()}><ArrowLeft className="size-4" aria-hidden />{step ? "Back" : "Cancel"}</Button>
          <div className="flex gap-2">
            {step < 5 && <Button type="button" variant="ghost" onClick={() => go(step + 1)}>Skip</Button>}
            <Button type="submit" variant="primary">{step === 5 ? "Find resources" : step === 4 ? "Review situation" : "Continue"}<ArrowRight className="size-4" aria-hidden /></Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
