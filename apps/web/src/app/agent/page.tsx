"use client";

// The assistant: chat on the left, live map on the right (map on top on phones).
// Replies are cards rendered from typed UI instructions, not walls of text.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileText, HeartPulse, House, MessageCircle, RotateCcw, Send, ShieldAlert } from "lucide-react";
import brand from "@shared/brand.json";
import { useAgent } from "@/lib/useAgent";
import { MapPanel } from "@/components/agent/MapPanel";
import { UICard } from "@/components/agent/Cards";
import { Button, Card } from "@/components/ui";
import { WrenAvatar, type WrenMood } from "@/components/Wren";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useAidAutopilot } from "@/components/aid/AidProvider";

const STATUS: Record<WrenMood, string> = {
  idle: "Disaster recovery assistant · official sources only",
  thinking: "Checking official sources…",
  typing: "Writing a reply…",
  searching: "Searching…",
};

// Types the reply out (Wren shows the typing pose meanwhile), then reveals the cards.
function TypedText({ text, onDone }: { text: string; onDone: () => void }) {
  const [n, setN] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) {
      const t = setTimeout(onDone, 0);
      return () => clearTimeout(t);
    }
    const step = Math.max(1, Math.ceil(text.length / 60)); // about one second whatever the length
    const t = setInterval(() => setN((c) => {
      if (c + step >= text.length) { clearInterval(t); setTimeout(onDone, 150); return text.length; }
      return c + step;
    }), 16);
    return () => clearInterval(t);
  }, [text, onDone, reduced]);
  if (reduced) return <>{text}</>;
  return <>{text.slice(0, n)}<span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-accent" aria-hidden /></>;
}

export default function AgentPage() {
  const agent = useAgent();
  const { agentDraft, setAgentDraft } = useAidAutopilot();
  const reduced = usePrefersReducedMotion();
  const [input, setInput] = useState(() => agentDraft?.text ?? "");
  const loadedDraft = useRef(agentDraft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const preset = agent.scenario?.presets.find((p) => p.id === agent.caseFile.preset);
  const mood: WrenMood = agent.pending ? "thinking" : agent.typingId ? "typing" : "idle";

  // Next can retain this page between visits. A new handoff replaces the composer
  // once; ordinary renders and returning to the same draft preserve user edits.
  useEffect(() => {
    if (agentDraft && agentDraft !== loadedDraft.current) setInput(agentDraft.text);
    loadedDraft.current = agentDraft;
  }, [agentDraft]);

  // Scroll only the message list (scrollIntoView would also scroll the page). A new reply
  // is shown from its top so its first card is read first.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const last = [...list.querySelectorAll<HTMLElement>("[data-msg]")].at(-1);
    const top = !agent.pending && last?.dataset.role === "assistant" ? last.offsetTop - 12 : list.scrollHeight;
    list.scrollTo({ top, behavior: reduced ? "instant" : "smooth" });
  }, [agent.messages.length, agent.pending, reduced]);

  function submit(text: string) {
    setInput("");
    setSelectedId(null);
    setAgentDraft(null);
    agent.send(text);
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-[1440px] flex-1 gap-4 p-4 [&>*]:min-w-0 lg:h-[calc(100dvh_-_5rem)] lg:min-h-[680px] lg:flex-none lg:grid-cols-[minmax(380px,0.8fr)_1.2fr] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:p-6">
      <div className="order-2 flex h-[75vh] min-h-0 flex-col lg:order-1 lg:h-full">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <WrenAvatar mood={mood} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl font-bold leading-tight">{brand.agentName}</p>
              <p className="truncate text-xs text-muted" aria-live="polite">{mood === "idle" ? "Your disaster recovery assistant" : STATUS[mood]}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-good-soft px-2.5 py-1 text-xs font-semibold text-good">
              <span className="size-1.5 rounded-full bg-good" aria-hidden /> Online
            </span>
            {agent.messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { agent.reset(); setSelectedId(null); }} aria-label="New conversation">
                <RotateCcw className="size-4" />
              </Button>
            )}
          </div>

          {agentDraft && <div className="border-b border-line bg-blue-soft px-4 py-3 text-sm">
            <p className="font-semibold">From Aid Autopilot · {agentDraft.programName}</p>
            <p className="mt-1 text-xs text-muted">Nothing has been sent. Review the prepared message before pressing Send. The map and local recommendations still use the selected demo scenario; your aid location has not been verified.</p>
            <button type="button" className="mt-1 min-h-11 text-xs font-semibold text-blue underline" onClick={() => { setInput(""); setAgentDraft(null); }}>Discard prepared request</button>
          </div>}

          {agent.scenarios.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
              <span className="text-xs font-medium text-muted">Demo scenario:</span>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Demo scenario">
                {agent.scenarios.map((sc) => {
                  const on = sc.id === agent.caseFile.scenario;
                  return (
                    <button key={sc.id} role="radio" aria-checked={on}
                      onClick={() => { if (!on) { agent.chooseScenario(sc.id); setSelectedId(null); } }}
                      className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                        on ? "bg-primary text-primary-ink" : "border border-line text-muted hover:text-ink"}`}>
                      {sc.title}{sc.hypothetical ? " (hypothetical)" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
            <span className="text-xs font-medium text-muted">{agent.scenario?.title ?? "Scenario"}:</span>
            <div className="flex flex-wrap rounded-3xl bg-surface-2 p-1" role="tablist">
              {(agent.scenario?.presets ?? []).map((p) => (
                <button key={p.id} role="tab" aria-selected={p.id === agent.caseFile.preset}
                  onClick={() => { agent.setPreset(p.id); setSelectedId(null); }}
                  className={`min-h-8 rounded-full px-3 text-xs font-semibold transition ${
                    p.id === agent.caseFile.preset ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-muted hover:text-ink"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={listRef} data-tour="agent-messages" className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            {agent.messages.length === 0 && (
              <div className="flex flex-col gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- static webp illustration */}
                <img src="/wren/scene-checklist.webp" alt="" width={144} height={144} className="size-36 object-contain" />
                <h1 className="text-2xl">Hi, I’m {brand.agentName}. What’s happening?</h1>
                <p className="text-sm text-muted">
                  {agent.scenario?.summary} I’ll answer with alerts, places on the map and a step-by-step plan, all
                  from official sources.
                </p>
                {agent.scenario?.hypothetical && (
                  <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
                    A hypothetical scenario for this demo. The places, programs and safety steps are real and sourced.
                  </p>
                )}
                {preset?.replay && (
                  <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
                    You’re viewing a replay of {preset.label.split(" · ")[0]}. Live alerts are still checked for today.
                  </p>
                )}
              </div>
            )}

            <AnimatePresence initial={false}>
              {agent.messages.map((m) => (
                <motion.div key={m.id} data-msg data-role={m.role} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2.5">
                  {m.role === "user" ? (
                    <p className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-blue-soft px-4 py-2.5 text-[15px] text-ink">{m.text}</p>
                  ) : (
                    <>
                      <div className="flex items-start gap-2.5">
                        <WrenAvatar mood={m.id === agent.typingId ? "typing" : "idle"} size={30} />
                        <p className={`pt-1 text-[15px] ${m.error ? "text-danger" : ""}`}>
                          {m.id === agent.typingId ? <TypedText text={m.text} onDone={agent.doneTyping} /> : m.text}
                        </p>
                      </div>
                      {m.id !== agent.typingId && m.ui?.map((card, i) => (
                        <motion.div key={`${m.id}-${card.type}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08 * (i + 1) }}>
                          <UICard card={card} selectedId={selectedId} onSelect={setSelectedId} />
                        </motion.div>
                      ))}
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {agent.pending && (
              <div className="flex items-center gap-3 text-sm text-muted">
                <WrenAvatar mood="thinking" size={48} />
                <span>Checking official alerts, places and programs…</span>
              </div>
            )}
          </div>

          {agent.messages.length < 2 && !agent.pending && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {(agent.scenario?.suggestions[agent.caseFile.preset] ?? []).map((s) => {
                const Icon = chipIcon(s);
                return (
                  <button key={s} onClick={() => submit(s)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-left text-[13px] text-ink transition-colors hover:border-ink">
                    <Icon className="size-4 shrink-0 text-muted" aria-hidden /> {s}
                  </button>
                );
              })}
            </div>
          )}

          <form data-tour="agent-input" onSubmit={(e) => { e.preventDefault(); submit(input); }} className="border-t border-line p-3">
            <div className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-5 pr-1.5 focus-within:border-ink">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Message ${brand.agentName}`}
                aria-label={`Message ${brand.agentName}`} maxLength={1000}
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle" />
              <button type="submit" disabled={!input.trim() || agent.pending} aria-label="Send"
                className="flex size-10 items-center justify-center rounded-full text-accent hover:bg-accent-soft disabled:text-subtle disabled:hover:bg-transparent">
                <Send className="size-5" aria-hidden />
              </button>
            </div>
            <p className="mt-1.5 px-2 text-[11px] text-subtle">General guidance only, not insurance or legal advice or local emergency instructions.</p>
          </form>
        </Card>
      </div>

      <div data-tour="agent-map" className="order-1 h-[42vh] min-h-0 lg:order-2 lg:h-full">
        <MapPanel key={agent.caseFile.scenario} scenario={agent.scenario} replayLabel={preset?.label.split(" · ")[0] ?? ""} resources={agent.resources?.items ?? []} liveAlerts={agent.alerts?.live ?? []}
          replay={!!preset?.replay} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </div>
  );
}

// A small icon for each quick-reply chip, picked from its wording.
function chipIcon(text: string) {
  const t = text.toLowerCase();
  if (/shelter|stay|tonight|home|house|dog/.test(t)) return House;
  if (/claim|insurance|id|papers|document/.test(t)) return FileText;
  if (/hospital|hurt/.test(t)) return HeartPulse;
  if (/safe|evacuat|rising|drive/.test(t)) return ShieldAlert;
  return MessageCircle;
}
