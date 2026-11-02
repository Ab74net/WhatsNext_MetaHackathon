"use client";

// The assistant: chat on the left, live map on the right (map on top on phones).
// Replies are cards rendered from typed UI instructions, not walls of text.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, Send } from "lucide-react";
import brand from "@shared/brand.json";
import type { ScenarioPresetId } from "@shared/types";
import { useAgent } from "@/lib/useAgent";
import { MapPanel } from "@/components/agent/MapPanel";
import { UICard } from "@/components/agent/Cards";
import { Button, Card } from "@/components/ui";
import { WrenAvatar, type WrenMood } from "@/components/Wren";

const SUGGESTIONS: Record<ScenarioPresetId, string[]> = {
  during: [
    "My home was damaged in the fire. What should I do first?",
    "I need shelter tonight with my dog",
    "We've been told to get ready to evacuate. What do we do?",
    "How do I start an insurance claim?",
  ],
  recovery: [
    "Our house burned down and we have insurance. What help can we get now?",
    "Is it safe to go back home?",
    "Is FEMA aid available yet?",
    "I lost my ID and documents in the fire",
  ],
};

const STATUS: Record<WrenMood, string> = {
  idle: "Disaster recovery assistant · official sources only",
  thinking: "Checking official sources…",
  typing: "Writing a reply…",
  searching: "Searching…",
};

// Types the reply out (Wren shows the typing pose meanwhile), then reveals the cards.
function TypedText({ text, onDone }: { text: string; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const step = Math.max(1, Math.ceil(text.length / 60)); // about one second whatever the length
    const t = setInterval(() => setN((c) => {
      if (c + step >= text.length) { clearInterval(t); setTimeout(onDone, 150); return text.length; }
      return c + step;
    }), 16);
    return () => clearInterval(t);
  }, [text, onDone]);
  return <>{text.slice(0, n)}<span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-accent" aria-hidden /></>;
}

export default function AgentPage() {
  const agent = useAgent();
  const [input, setInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const preset = agent.scenario?.presets.find((p) => p.id === agent.caseFile.preset);
  const mood: WrenMood = agent.pending ? "thinking" : agent.typingId ? "typing" : "idle";

  // Scroll only the message list (scrollIntoView would also scroll the page). A new reply
  // is shown from its top so its first card is read first.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const last = [...list.querySelectorAll<HTMLElement>("[data-msg]")].at(-1);
    const top = !agent.pending && last?.dataset.role === "assistant" ? last.offsetTop - 12 : list.scrollHeight;
    list.scrollTo({ top, behavior: "smooth" });
  }, [agent.messages.length, agent.pending]);

  function submit(text: string) {
    setInput("");
    setSelectedId(null);
    agent.send(text);
  }

  return (
    <div className="grid flex-1 gap-3 p-3 lg:h-[calc(100dvh_-_3.5rem)] lg:flex-none lg:grid-cols-[minmax(380px,520px)_1fr] lg:grid-rows-[minmax(0,1fr)] lg:gap-4 lg:p-4">
      <div className="order-2 flex h-[75vh] min-h-0 flex-col lg:order-1 lg:h-full">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <WrenAvatar mood={mood} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{brand.agentName}</p>
              <p className={`truncate text-xs ${mood === "idle" ? "text-muted" : "text-accent"}`} aria-live="polite">{STATUS[mood]}</p>
            </div>
            {agent.messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { agent.reset(); setSelectedId(null); }} aria-label="New conversation">
                <RotateCcw className="size-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 border-b border-line px-4 py-2">
            <span className="text-xs font-medium text-muted">{agent.scenario?.title ?? "Scenario"}:</span>
            <div className="flex rounded-lg bg-surface-2 p-0.5" role="tablist">
              {(agent.scenario?.presets ?? []).map((p) => (
                <button key={p.id} role="tab" aria-selected={p.id === agent.caseFile.preset}
                  onClick={() => { agent.setPreset(p.id); setSelectedId(null); }}
                  className={`h-7 rounded-md px-2.5 text-xs font-semibold transition ${
                    p.id === agent.caseFile.preset ? "bg-surface text-accent shadow-card" : "text-muted hover:text-ink"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={listRef} data-tour="agent-messages" className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            {agent.messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <WrenAvatar mood="idle" size={88} />
                <h1 className="text-2xl">Hi, I’m {brand.agentName}. What’s happening?</h1>
                <p className="text-sm text-muted">
                  {agent.scenario?.summary} I’ll answer with alerts, places on the map and a step-by-step plan, all
                  from official sources.
                </p>
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
                    <p className="max-w-[85%] self-end rounded-lg rounded-br-sm bg-accent px-3.5 py-2 text-[15px] text-accent-ink">{m.text}</p>
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
              {SUGGESTIONS[agent.caseFile.preset].map((s) => (
                <button key={s} onClick={() => submit(s)}
                  className="rounded-md bg-surface-2 px-3 py-2 text-left text-[13px] text-ink transition-colors hover:bg-accent-soft hover:text-accent">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form data-tour="agent-input" onSubmit={(e) => { e.preventDefault(); submit(input); }} className="border-t border-line p-3">
            <div className="flex items-center gap-2 rounded-lg bg-surface-2 py-1.5 pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-accent">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Message ${brand.agentName}`}
                aria-label={`Message ${brand.agentName}`} maxLength={1000}
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle" />
              <button type="submit" disabled={!input.trim() || agent.pending} aria-label="Send"
                className="flex size-10 items-center justify-center rounded-md bg-accent text-accent-ink disabled:opacity-40">
                <Send className="size-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1.5 px-2 text-[11px] text-subtle">General guidance only, not insurance or legal advice or local emergency instructions.</p>
          </form>
        </Card>
      </div>

      <div data-tour="agent-map" className="order-1 h-[42vh] min-h-0 lg:order-2 lg:h-full">
        <MapPanel scenario={agent.scenario} resources={agent.resources?.items ?? []} liveAlerts={agent.alerts?.live ?? []}
          replay={!!preset?.replay} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </div>
  );
}
