"use client";

// Document replacement order. The user taps what they lost and picks a state; the checklist
// comes from the curated data file (never the model), sorted so prerequisites come first.
// Lost / done / state live on this device only. Spark only answers follow-up questions,
// grounded in the selected entries, with the question redacted first.

import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, List, Lock, Phone, Route, TriangleAlert } from "lucide-react";
import type { DocumentAnswer, DocumentEntry, DocumentGuide, DocumentState } from "@shared/types";
import { api } from "@/lib/api";
import { useDeviceState } from "@/lib/deviceState";
import { redact, replacementOrder, waitingOn } from "@/lib/documentOrder";
import { fillTemplate, formatDate } from "@/lib/insurerCall";
import { Badge, Button, Notice, Skeleton } from "@/components/ui";
import { DocumentPath } from "./DocumentPath";

const NONE: string[] = [];
const WHERE_LABEL = { online: "Online", in_person: "In person", phone: "Phone", mail: "Mail" } as const;

export function Documents() {
  const [state, setState] = useDeviceState("docs:state", "VA");
  const [lost, setLost] = useDeviceState("docs:lost", NONE);
  const [done, setDone] = useDeviceState("docs:done", NONE);
  const [view, setView] = useDeviceState<"list" | "path">("docs:view", "list");
  const [states, setStates] = useState<DocumentState[] | null>(null);
  const [guide, setGuide] = useState<DocumentGuide | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { api.documentStates().then(setStates).catch(() => setFailed(true)); }, []);
  const available = states?.find((s) => s.state === state)?.available ?? true;
  useEffect(() => {
    if (!available) return;
    let live = true;
    api.documentGuide(state).then((g) => live && setGuide(g)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [state, available]);

  const lostSet = useMemo(() => new Set(lost), [lost]);
  const doneSet = useMemo(() => new Set(done), [done]);
  const { order, cycle } = useMemo(() => replacementOrder(guide?.documents ?? [], lost), [guide, lost]);
  const byId = useMemo(() => new Map((guide?.documents ?? []).map((d) => [d.id, d])), [guide]);
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="flex flex-col gap-8">
      <Notice tone="neutral">
        <p>
          What you choose here stays on this device. Requirements come from each agency’s official page, with the date
          we checked it. Rules can change, so confirm with the agency before you go.
        </p>
      </Notice>

      <label className="flex max-w-xs flex-col gap-1.5 text-sm text-muted">
        Your state
        <select value={state} onChange={(e) => { setGuide(null); setState(e.target.value); }}
          className="h-12 rounded-md bg-surface-2 px-3 text-[15px] text-ink">
          {(states ?? [{ state: "VA", state_name: "Virginia", available: true }]).map((s) => (
            <option key={s.state} value={s.state}>{s.state_name}{s.available ? "" : " (coming soon)"}</option>
          ))}
        </select>
      </label>

      {failed && <Notice tone="warn">Couldn’t load the document guide. Check your connection and reload the page.</Notice>}
      {!available && (
        <Notice tone="neutral">
          Coming soon for {states?.find((s) => s.state === state)?.state_name}. For now, contact the agency that issued each document.
        </Notice>
      )}
      {available && !guide && !failed && <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>}

      {available && guide && (
        <>
          <section aria-labelledby="lost-h">
            <h2 id="lost-h" className="text-2xl">What did you lose?</h2>
            <p className="mt-1 text-[15px] text-muted">Tap everything that is gone. You can change this any time.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {guide.documents.map((d) => {
                const on = lostSet.has(d.id);
                return (
                  <button key={d.id} type="button" aria-pressed={on} onClick={() => setLost((l) => toggle(l, d.id))}
                    className={`flex min-h-20 items-start gap-2 rounded-lg p-3 text-left text-[15px] font-medium transition-colors ${
                      on ? "bg-accent-soft text-ink ring-2 ring-accent" : "bg-surface-2 text-muted hover:text-ink"}`}>
                    <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 ${on ? "border-accent bg-accent text-accent-ink" : "border-subtle"}`}>
                      {on && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                    </span>
                    {d.name}
                  </button>
                );
              })}
            </div>
          </section>

          {lost.length > 0 && (
            <section aria-labelledby="order-h" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 id="order-h" className="text-2xl">Your replacement order</h2>
                  <p className="mt-1 text-[15px] text-muted">
                    Some documents need another one first, so the order matters. Check each step off as you finish it.
                  </p>
                </div>
                <div className="flex gap-1 rounded-lg bg-surface-2 p-1" role="group" aria-label="View">
                  {([["list", "List", List], ["path", "Path", Route]] as const).map(([v, label, Icon]) => (
                    <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${view === v ? "bg-surface-3 text-ink" : "text-muted"}`}>
                      <Icon className="size-4" aria-hidden /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {cycle.length > 0 && (
                <Notice tone="warn">Some of these depend on each other. Ask the agency which to do first.</Notice>
              )}

              {view === "path" ? (
                <DocumentPath entries={order.map((id) => byId.get(id)!)} lost={lostSet} done={doneSet}
                  onToggle={(id) => setDone((d) => toggle(d, id))} />
              ) : (
                <ol className="flex flex-col">
                  {order.map((id, i) => {
                    const d = byId.get(id)!;
                    const phaseStart = i === 0 || byId.get(order[i - 1])!.phase !== d.phase;
                    const phase = guide.phases.find((p) => p.id === d.phase)!;
                    return (
                      <li key={id}>
                        {phaseStart && (
                          <div className="mb-2 mt-6 first:mt-0">
                            <h3 className="text-lg">{phase.label}</h3>
                            <p className="text-sm text-muted">{phase.why}</p>
                          </div>
                        )}
                        <DocumentStep n={i + 1} d={d} byId={byId} waiting={waitingOn(d, lostSet, doneSet)} done={doneSet.has(id)}
                          onToggle={() => setDone((x) => toggle(x, id))} />
                      </li>
                    );
                  })}
                </ol>
              )}

              {lostSet.has("medications") && <PharmacyNote />}
              <AskBox state={state} docIds={order} byId={byId} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function DocumentStep({ n, d, byId, waiting, done, onToggle }: {
  n: number; d: DocumentEntry; byId: Map<string, DocumentEntry>; waiting: string[]; done: boolean; onToggle: () => void;
}) {
  const locked = waiting.length > 0 && !done;
  const confirm = !d.verified || !d.prerequisites_verified;
  return (
    <article className={`flex gap-3 border-t border-line py-4 ${locked ? "opacity-80" : ""}`} aria-label={`Step ${n}: ${d.name}`}>
      <button type="button" role="checkbox" aria-checked={done} aria-label={`Done: ${d.name}`} onClick={onToggle}
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-md hover:bg-surface-2">
        <span className={`flex size-6 items-center justify-center rounded border-2 ${done ? "border-good bg-good text-good-ink" : "border-subtle"}`}>
          {done && <Check className="size-4" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-2">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h4 className={`font-display text-lg font-semibold ${done ? "text-muted line-through decoration-subtle" : ""}`}>
            <span className="mr-2 text-accent tabular-nums">{n}</span>{d.name}
          </h4>
          <span className="text-sm text-muted">{d.issuing_agency}</span>
        </div>

        {locked && (
          <p className="flex items-center gap-1.5 text-sm text-warn">
            <Lock className="size-3.5" aria-hidden /> Do this after: {waiting.map((w) => byId.get(w)?.name).join(", ")}
          </p>
        )}
        {d.prerequisites.length > 0 && (
          <p className="text-sm text-muted">
            Why here: {d.prerequisites_note || `it may need your ${d.prerequisites.map((p) => byId.get(p)?.name.toLowerCase()).join(" and ")} first.`}
            {!d.prerequisites_verified && " Ask the agency to confirm."}
          </p>
        )}
        {confirm && (
          <p className="flex items-start gap-1.5 text-sm text-warn">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Not every detail here could be confirmed on an official page. Call this agency to confirm what you need.
          </p>
        )}

        <ul className="list-disc space-y-1 pl-5 text-[15px]">
          {d.steps.map((s) => <li key={s}>{s}</li>)}
        </ul>
        {d.needed_items.length > 0 && (
          <div className="text-[15px]">
            <p className="text-sm font-semibold text-muted">What you need</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">{d.needed_items.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        )}
        {(d.timing_note || d.id_card_note) && <p className="text-sm text-muted">{d.timing_note || d.id_card_note}</p>}

        <div className="flex flex-wrap items-center gap-1.5">
          {d.where.map((w) => <Badge key={w}>{WHERE_LABEL[w]}</Badge>)}
        </div>
        <dl className="grid gap-1 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-muted">Fees</dt><dd>{d.fees_note || "Not listed here. Ask the agency."}</dd>
          <dt className="text-muted">Disaster help</dt><dd>{d.disaster_waiver_note || "No disaster fee waiver is listed on the official page. Ask the agency."}</dd>
        </dl>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {d.phone && (
            <a href={`tel:${d.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-accent hover:underline">
              <Phone className="size-4" aria-hidden /> {d.phone}
            </a>
          )}
          {d.official_url ? (
            <a href={d.official_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-accent hover:underline">
              Official page <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : <span className="text-muted">No official page on file</span>}
          <span className="text-subtle">Last checked {formatDate(d.last_verified)}</span>
        </div>
      </div>
    </article>
  );
}

const LETTER = `Hello,

My medicines were lost in a disaster, and I need help replacing them.

My name: {{my_name}}
Date of birth: {{date_of_birth}}
Medicines: {{medicines}}
Pharmacy: {{pharmacy}}

Please tell me what you need from me to replace these medicines. You can reach me at {{my_phone}}.

Thank you.`;

// Filled in on the device only; nothing here is sent anywhere.
function PharmacyNote() {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ my_name: "", date_of_birth: "", medicines: "", pharmacy: "", my_phone: "" });
  const text = fillTemplate(LETTER, v);
  return (
    <div className="rounded-lg bg-surface p-5">
      <h3 className="text-lg">A note for your pharmacy or prescriber</h3>
      <p className="mt-1 text-sm text-muted">Written on this device. Read it aloud on the phone, or copy it into a message.</p>
      {!open ? (
        <Button className="mt-3" onClick={() => setOpen(true)}>Write the note</Button>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([["my_name", "Your name"], ["date_of_birth", "Date of birth"], ["medicines", "Medicines"], ["pharmacy", "Pharmacy"], ["my_phone", "Your phone"]] as const).map(([k, label]) => (
            <label key={k} className="flex flex-col gap-1.5 text-sm text-muted">{label}
              <input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} autoComplete="off"
                className="h-12 rounded-md bg-surface-2 px-3 text-[15px] text-ink" />
            </label>
          ))}
          <textarea readOnly value={text} rows={12} aria-label="Your note"
            className="rounded-md bg-surface-2 px-3 py-2.5 text-[15px] leading-relaxed sm:col-span-2" />
        </div>
      )}
    </div>
  );
}

function AskBox({ state, docIds, byId }: { state: string; docIds: string[]; byId: Map<string, DocumentEntry> }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<DocumentAnswer | null>(null);
  const [error, setError] = useState(false);
  const clean = redact(q);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!clean.trim()) return;
    setBusy(true); setError(false);
    try { setAnswer(await api.askDocuments({ state, doc_ids: docIds, question: clean })); } catch { setError(true); }
    setBusy(false);
  }

  return (
    <form onSubmit={ask} className="rounded-lg bg-surface p-5">
      <h3 className="text-lg">Ask about these documents</h3>
      <p className="mt-1 text-sm text-muted">
        Answers use only the official information above. Don’t include names or numbers; they are removed before your question is sent.
      </p>
      <div className="mt-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} aria-label="Your question"
          placeholder="For example: can I order a birth certificate by mail?"
          className="h-12 min-w-0 flex-1 rounded-md bg-surface-2 px-3 text-[15px] placeholder:text-subtle" />
        <Button type="submit" size="lg" variant="primary" loading={busy} disabled={!clean.trim()}>Ask</Button>
      </div>
      {clean !== q && q && <p className="mt-2 text-xs text-muted">Will be sent as: “{clean}”</p>}
      {error && <p className="mt-3 text-sm text-warn">Couldn’t get an answer. Please call the agency.</p>}
      {answer && (
        <div className="mt-4 border-t border-line pt-4" aria-live="polite">
          <p className="text-[15px]">{answer.answer}</p>
          <p className="mt-2 text-xs text-subtle">
            Based on: {answer.doc_ids.map((i) => byId.get(i)?.name).filter(Boolean).join(", ")}. General guidance, not legal advice.
          </p>
        </div>
      )}
    </form>
  );
}
