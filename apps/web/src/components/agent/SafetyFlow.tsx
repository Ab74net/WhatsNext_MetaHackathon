"use client";

// Pre-authored wildfire safety flow. The user picks their situation; animated step cards
// play from content/safety/wildfire.json. Every step shows its official source, and the
// 911 banner is always on screen. The model never writes these steps.

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Backpack, BatteryCharging, BellRing, Camera, ChevronLeft, ChevronRight, DoorClosed, ExternalLink, Flame, Footprints,
  House, Lightbulb, Map as MapIcon, MessageSquareText, Pause, Phone, Play, Shirt, ShieldCheck, ShieldPlus, Stethoscope,
  TriangleAlert, Wind,
} from "lucide-react";
import type { SafetyBranch, SafetyFlowCard } from "@shared/types";
import { Card } from "@/components/ui";

const ICONS: Record<string, typeof Phone> = {
  run: Footprints, bell: BellRing, home: House, mask: ShieldPlus, message: MessageSquareText, alert: TriangleAlert,
  bag: Backpack, battery: BatteryCharging, map: MapIcon, phone: Phone, light: Lightbulb, door: DoorClosed, wind: Wind,
  health: Stethoscope, check: ShieldCheck, flame: Flame, shirt: Shirt, camera: Camera,
};
const TONE = {
  danger: "border-danger/40 hover:bg-danger-soft",
  warn: "border-warn/40 hover:bg-warn-soft",
  neutral: "border-line hover:bg-surface-2",
};
const STEP_MS = 5000;

export function SafetyFlowView({ card }: { card: SafetyFlowCard }) {
  const [branchId, setBranchId] = useState<string | null>(card.initial);
  const branch = card.branches.find((b) => b.id === branchId) ?? null;

  return (
    <Card className="overflow-hidden">
      <a href="tel:911" className="flex h-10 items-center justify-center gap-2 bg-danger text-sm font-semibold text-white hover:brightness-110">
        <Phone className="size-4" aria-hidden /> In danger? Call 911.
      </a>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Flame className="size-[18px] text-[#ea580c]" aria-hidden />
        <p className="flex-1 font-semibold">{card.title}</p>
        {branch && <button onClick={() => setBranchId(null)} className="text-xs font-semibold text-accent hover:underline">Change situation</button>}
      </div>

      {branch ? <StepPlayer key={branch.id} branch={branch} card={card} /> : (
        <div className="flex flex-col gap-2 p-4">
          <p className="text-sm font-semibold">{card.question}</p>
          {card.branches.map((b) => (
            <button key={b.id} onClick={() => setBranchId(b.id)}
              className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition ${TONE[b.tone]}`}>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{b.label}</span>
                <span className="block text-xs text-muted">{b.hint}</span>
              </span>
              <ChevronRight className="size-4 text-subtle" aria-hidden />
            </button>
          ))}
        </div>
      )}

      <p className="border-t border-line px-4 py-2.5 text-[11px] text-muted">
        {card.disclaimer} Checked {new Date(`${card.checked_at}T12:00:00`).toLocaleDateString()}.
      </p>
    </Card>
  );
}

function StepPlayer({ branch, card }: { branch: SafetyBranch; card: SafetyFlowCard }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const step = branch.steps[i];
  const last = i === branch.steps.length - 1;
  const source = card.sources.find((s) => s.id === step.source);
  const Icon = ICONS[step.icon] ?? ShieldCheck;

  // Auto-advance like a short animation; stops on the last step or when paused.
  useEffect(() => {
    if (!playing || last) return;
    const t = setTimeout(() => setI((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, last, i]);

  const go = (n: number) => { setPlaying(false); setI(n); };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm font-semibold">{branch.label}</p>
        <span className="text-xs tabular-nums text-subtle">{i + 1}/{branch.steps.length}</span>
      </div>

      <div className="flex gap-1" aria-hidden>
        {branch.steps.map((_, n) => (
          <span key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            {n < i && <span className="block h-full w-full bg-accent" />}
            {n === i && (
              <motion.span key={`${i}-${playing}`} className="block h-full bg-accent"
                initial={{ width: playing && !last ? "0%" : "100%" }} animate={{ width: "100%" }}
                transition={{ duration: playing && !last ? STEP_MS / 1000 : 0, ease: "linear" }} />
            )}
          </span>
        ))}
      </div>

      <div className="relative min-h-44">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            className={`flex flex-col gap-2.5 rounded-xl p-4 ${branch.emergency && i === 0 ? "bg-danger text-white" : "bg-surface-2"}`}
            aria-live="polite">
            <motion.span initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.05 }}
              className={`flex size-12 items-center justify-center rounded-full ${branch.emergency && i === 0 ? "bg-white text-danger" : "bg-accent-soft text-accent"}`}>
              <Icon className="size-6" aria-hidden />
            </motion.span>
            <p className="text-lg font-bold leading-tight">{step.title}</p>
            <p className={`text-sm ${branch.emergency && i === 0 ? "text-white/90" : "text-ink"}`}>{step.text}</p>
            {branch.emergency && i === 0 && (
              <a href="tel:911" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white font-bold text-danger">
                <Phone className="size-4" aria-hidden /> Call 911
              </a>
            )}
            {step.action === "start_claim" && (
              <Link href="/claims" className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-ink">
                <Camera className="size-4" aria-hidden /> Build your inventory from photos
              </Link>
            )}
            {source && (
              <a href={source.url} target="_blank" rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-[11px] ${branch.emergency && i === 0 ? "text-white/80" : "text-subtle hover:text-accent"}`}>
                Source: {source.name} <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={() => go(Math.max(0, i - 1))} disabled={i === 0} aria-label="Previous step"
          className="flex size-8 items-center justify-center rounded-lg bg-surface-3 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
        {!last && (
          <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}
            className="flex size-8 items-center justify-center rounded-lg bg-surface-3">{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
        )}
        <button onClick={() => go(Math.min(branch.steps.length - 1, i + 1))} disabled={last}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-[13px] font-semibold text-accent-ink disabled:opacity-40">
          Next step <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
