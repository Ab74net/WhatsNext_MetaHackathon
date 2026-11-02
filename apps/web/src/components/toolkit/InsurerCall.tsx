"use client";

// Insurer-call prep sheet: before, during and after the call.
// Privacy: every field here lives on this device only (useDeviceState). The only request to
// the server is the hazard type and "has inventory" for tailoring the question list.

import { useEffect, useId, useState } from "react";
import { Check, Clock, Copy, Mail, Plus, Printer, RotateCcw, Trash2 } from "lucide-react";
import type { Hazard, InsurerQuestions } from "@shared/types";
import { api } from "@/lib/api";
import { clearDeviceState, useDeviceState } from "@/lib/deviceState";
import {
  buildFollowUpEmail, EMPTY_NOTES, EMPTY_PREP, timeStamp, type CallNotes, type PrepDetails,
} from "@/lib/insurerCall";
import { Button, Notice, Skeleton } from "@/components/ui";

const SCOPE = "insurer:";
const HAZARDS: { value: Hazard; label: string }[] = [
  { value: "wildfire", label: "Wildfire" }, { value: "flood", label: "Flood" }, { value: "hurricane", label: "Hurricane" },
  { value: "tornado", label: "Tornado" }, { value: "earthquake", label: "Earthquake" }, { value: "other", label: "Something else" },
];
const READY: { key: keyof PrepDetails | "photos"; label: string; type?: string; placeholder?: string }[] = [
  { key: "policyNumber", label: "Policy number" },
  { key: "claimNumber", label: "Claim number, if you have one" },
  { key: "dateOfLoss", label: "Date of loss", type: "date" },
  { key: "damagedAddress", label: "Address of the damaged home" },
  { key: "myPhone", label: "A number where they can reach you", type: "tel" },
  { key: "tempAddress", label: "Where you are staying now" },
  { key: "myName", label: "Your name, for the follow-up email" },
  { key: "photos", label: "Photos of the damage and your belongings" },
];
const NO_FLAGS: Record<string, boolean> = {};
const NO_CUSTOM: string[] = [];
const DEFAULT_HAZARD: Hazard = "wildfire";

export function InsurerCall() {
  const [prep, setPrep] = useDeviceState<PrepDetails>(`${SCOPE}prep`, EMPTY_PREP);
  const [ready, setReady] = useDeviceState(`${SCOPE}ready`, NO_FLAGS);
  const [asked, setAsked] = useDeviceState(`${SCOPE}asked`, NO_FLAGS);
  const [custom, setCustom] = useDeviceState(`${SCOPE}custom`, NO_CUSTOM);
  const [notes, setNotes] = useDeviceState<CallNotes>(`${SCOPE}notes`, EMPTY_NOTES);
  const [hazard, setHazard] = useDeviceState<Hazard>(`${SCOPE}hazard`, DEFAULT_HAZARD);
  const [hasInventory, setHasInventory] = useDeviceState(`${SCOPE}has-inventory`, false);

  const setNote = <K extends keyof CallNotes>(k: K, v: CallNotes[K]) => setNotes((n) => ({ ...n, [k]: v }));

  return (
    <div className="flex flex-col gap-10">
      <Notice tone="neutral">
        <p>
          <strong className="text-ink">Everything you type here stays on this device.</strong> It is never sent to us or to
          an AI model. General consumer guidance, not legal advice. Policy terms and state rules vary, and only your insurer
          can tell you what your policy covers.
        </p>
      </Notice>

      {/* 1. Before the call */}
      <section aria-labelledby="before" className="flex flex-col gap-5">
        <SectionHead n={1} id="before" title="Before the call" />
        <div>
          <h3 className="text-lg">Have these ready</h3>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {READY.map((r) => (
              <li key={r.key} className="flex items-start gap-3">
                <CheckBox checked={!!ready[r.key]} label={r.label}
                  onChange={(v) => setReady((p) => ({ ...p, [r.key]: v }))} />
                {r.key === "photos" ? (
                  <span className="min-h-12 pt-3 text-[15px]">{r.label}</span>
                ) : (
                  <Field label={r.label} type={r.type} value={prep[r.key as keyof PrepDetails]}
                    onChange={(v) => setPrep((p) => ({ ...p, [r.key]: v }))} />
                )}
              </li>
            ))}
          </ul>
        </div>

        <Questions hazard={hazard} setHazard={setHazard} hasInventory={hasInventory} setHasInventory={setHasInventory}
          asked={asked} setAsked={setAsked} custom={custom} setCustom={setCustom} />

        <p className="text-sm text-muted">
          Tip: if you want to record the call, ask the representative for permission first. Call-recording laws differ by state.
        </p>
      </section>

      {/* 2. During the call */}
      <section aria-labelledby="during" className="flex flex-col gap-5">
        <SectionHead n={2} id="during" title="During the call" />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Date and time of the call" type="datetime-local" value={notes.callAt} onChange={(v) => setNote("callAt", v)} large />
          <Field label="Representative’s name" value={notes.repName} onChange={(v) => setNote("repName", v)} large />
          <Field label="Reference or claim number" value={notes.reference} onChange={(v) => setNote("reference", v)} large />
        </div>
        <Area label="What they told you or promised" value={notes.promised} onChange={(v) => setNote("promised", v)} rows={4} />
        <div className="flex flex-col gap-2">
          <Area label="Call notes" value={notes.log} onChange={(v) => setNote("log", v)} rows={5} id="call-log" />
          <Button size="lg" className="self-start" onClick={() => {
            const now = new Date();
            setNotes((n) => ({
              ...n,
              callAt: n.callAt || localDateTime(now),
              log: `${n.log}${n.log && !n.log.endsWith("\n") ? "\n" : ""}${timeStamp(now)}`,
            }));
            requestAnimationFrame(() => {
              const el = document.getElementById("call-log") as HTMLTextAreaElement | null;
              el?.focus();
              el?.setSelectionRange(el.value.length, el.value.length);
            });
          }}>
            <Clock className="size-[18px]" aria-hidden /> Stamp the time
          </Button>
        </div>
        <NextSteps steps={notes.steps} onChange={(steps) => setNote("steps", steps)} />
      </section>

      {/* 3. After the call */}
      <section aria-labelledby="after" className="flex flex-col gap-5">
        <SectionHead n={3} id="after" title="After the call" />
        <FollowUp prep={prep} notes={notes} />
        <div className="flex flex-wrap gap-3 border-t border-line pt-5 print:hidden">
          <Button onClick={() => window.print()}><Printer className="size-4" aria-hidden /> Print this sheet</Button>
          <Button variant="ghost" onClick={() => {
            if (window.confirm("Erase everything you typed on this page? This cannot be undone.")) clearDeviceState(SCOPE);
          }}>
            <RotateCcw className="size-4" aria-hidden /> Clear my notes
          </Button>
        </div>
      </section>
    </div>
  );
}

function Questions({ hazard, setHazard, hasInventory, setHasInventory, asked, setAsked, custom, setCustom }: {
  hazard: Hazard; setHazard: (h: Hazard) => void; hasInventory: boolean; setHasInventory: (v: boolean) => void;
  asked: Record<string, boolean>; setAsked: (f: (p: Record<string, boolean>) => Record<string, boolean>) => void;
  custom: string[]; setCustom: (f: (p: string[]) => string[]) => void;
}) {
  const [data, setData] = useState<InsurerQuestions | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState("");

  // Only the hazard type and the inventory yes/no are sent.
  useEffect(() => {
    let live = true;
    api.insurerQuestions({ hazard, has_inventory: hasInventory })
      .then((d) => { if (live) { setData(d); setError(false); } })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [hazard, hasInventory, attempt]);

  const list = [...(data?.questions ?? []).map((q) => ({ text: q.text, why: q.why })), ...custom.map((text) => ({ text, why: "" }))];

  return (
    <div>
      <h3 className="text-lg">Questions to ask</h3>
      <div className="mt-3 flex flex-wrap items-end gap-4 print:hidden">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          What happened
          <select value={hazard} onChange={(e) => { setData(null); setHazard(e.target.value as Hazard); }}
            className="h-12 rounded-md bg-surface-2 px-3 text-[15px] text-ink">
            {HAZARDS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-3 text-[15px]">
          <input type="checkbox" checked={hasInventory} onChange={(e) => { setData(null); setHasInventory(e.target.checked); }}
            className="size-5 accent-[var(--accent)]" />
          I already have a list of what I lost
        </label>
      </div>

      {error && !data && (
        <div className="mt-4"><Notice tone="warn">
          Couldn’t load the questions. <button className="font-semibold underline" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </Notice></div>
      )}
      {!data && !error && (
        <div className="mt-4 flex flex-col gap-3" aria-label="Loading questions">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
        </div>
      )}
      {data && (
        <>
          <ol className="mt-4 flex flex-col">
            {list.map((q, i) => (
              <li key={`${i}-${q.text}`} className="flex items-start gap-3 border-t border-line py-3 first:border-t-0">
                <CheckBox checked={!!asked[q.text]} label={`Asked: ${q.text}`}
                  onChange={(v) => setAsked((p) => ({ ...p, [q.text]: v }))} />
                <div className="min-w-0 flex-1 pt-2.5">
                  <p className={`text-[15px] ${asked[q.text] ? "text-muted line-through decoration-subtle" : ""}`}>{q.text}</p>
                  {q.why && <p className="mt-1 text-sm text-muted">{q.why}</p>}
                </div>
                {i >= list.length - custom.length && (
                  <button type="button" aria-label={`Remove question: ${q.text}`} onClick={() => setCustom((c) => c.filter((t) => t !== q.text))}
                    className="inline-flex size-12 items-center justify-center rounded-md text-subtle hover:text-danger print:hidden">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-1 text-xs text-subtle print:hidden">
            {data.tailored ? "Adjusted for your situation using only the type of disaster and whether you have a list." : "A standard list of questions."}
          </p>
          <form className="mt-3 flex gap-2 print:hidden" onSubmit={(e) => {
            e.preventDefault();
            const t = draft.trim();
            if (t) setCustom((c) => [...c, t.endsWith("?") ? t : `${t}?`]);
            setDraft("");
          }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add your own question" aria-label="Add your own question"
              maxLength={200} className="h-12 min-w-0 flex-1 rounded-md bg-surface-2 px-3 text-[15px] placeholder:text-subtle" />
            <Button type="submit" size="lg" disabled={!draft.trim()}><Plus className="size-4" aria-hidden /> Add</Button>
          </form>
        </>
      )}
    </div>
  );
}

function NextSteps({ steps, onChange }: { steps: CallNotes["steps"]; onChange: (s: CallNotes["steps"]) => void }) {
  const update = (id: string, patch: Partial<CallNotes["steps"][number]>) =>
    onChange(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  return (
    <div>
      <h3 className="text-lg">Next steps and dates</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
            <Field label={`Step ${i + 1}`} value={s.text} onChange={(v) => update(s.id, { text: v })} />
            <div className="w-44 shrink-0"><Field label="By when" type="date" value={s.due} onChange={(v) => update(s.id, { due: v })} /></div>
            <button type="button" aria-label={`Remove step ${i + 1}`} onClick={() => onChange(steps.filter((x) => x.id !== s.id))}
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-md text-subtle hover:text-danger print:hidden">
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Button className="mt-3 print:hidden" onClick={() => onChange([...steps, { id: crypto.randomUUID(), text: "", due: "" }])}>
        <Plus className="size-4" aria-hidden /> Add a step
      </Button>
    </div>
  );
}

function FollowUp({ prep, notes }: { prep: PrepDetails; notes: CallNotes }) {
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the text is still selectable */ }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-muted">
        A short email after the call gives you a written record of what was said. It is written here on your device from your
        notes. You review it and send it yourself; this app never sends anything.
      </p>
      <Button variant="primary" size="lg" className="self-start print:hidden" onClick={() => setDraft(buildFollowUpEmail(prep, notes))}>
        <Mail className="size-[18px]" aria-hidden /> {draft ? "Rewrite from my notes" : "Write my follow-up email"}
      </Button>
      {draft && (
        <div className="flex flex-col gap-3">
          <Field label="Subject" value={draft.subject} onChange={(v) => setDraft({ ...draft, subject: v })} />
          <Area label="Email" value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} rows={16} />
          <p className="text-sm text-muted">Anything in [brackets] is missing. Fill it in before you send.</p>
          <div className="flex flex-wrap gap-3 print:hidden">
            <Button onClick={copy} aria-live="polite">
              {copied ? <><Check className="size-4" aria-hidden /> Copied</> : <><Copy className="size-4" aria-hidden /> Copy email</>}
            </Button>
            <a href={`mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface-3 px-3.5 text-sm font-semibold text-ink hover:brightness-110">
              <Mail className="size-4" aria-hidden /> Open in my email app
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Small form pieces: large tap targets, visible labels ------------------------------------

function SectionHead({ n, id, title }: { n: number; id: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-line pb-3">
      <span className="font-serif text-2xl text-accent tabular-nums" aria-hidden>{n}</span>
      <h2 id={id} className="text-2xl">{title}</h2>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", large = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; large?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off"
        className={`h-12 rounded-md bg-surface-2 px-3 text-ink [color-scheme:dark] placeholder:text-subtle print:border print:border-black ${large ? "text-lg" : "text-[15px]"}`} />
    </div>
  );
}

function Area({ label, value, onChange, rows, id }: { label: string; value: string; onChange: (v: string) => void; rows: number; id?: string }) {
  const autoId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id ?? autoId} className="text-sm text-muted">{label}</label>
      <textarea id={id ?? autoId} rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-md bg-surface-2 px-3 py-2.5 text-[15px] leading-relaxed text-ink print:border print:border-black" />
    </div>
  );
}

function CheckBox({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className="mt-0.5 inline-flex size-12 shrink-0 items-center justify-center rounded-md hover:bg-surface-2">
      <span className={`flex size-6 items-center justify-center rounded border-2 transition-colors ${
        checked ? "border-good bg-good text-good-ink" : "border-subtle"}`}>
        {checked && <Check className="size-4" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}

function localDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
