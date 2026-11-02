"use client";

// Claims helper: choose photos -> scan -> review -> export.

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Check, FileDown, ListChecks, Network, ScanSearch, Trash2, TriangleAlert } from "lucide-react";
import { useClaimSession } from "@/lib/useClaimSession";
import { SelectStep, type Pick } from "@/components/claims/SelectStep";
import { ScanStep } from "@/components/claims/ScanStep";
import { ReviewStep } from "@/components/claims/ReviewStep";
import { ExportStep } from "@/components/claims/ExportStep";
import { MemoryStep } from "@/components/claims/MemoryStep";
import { Button, Notice } from "@/components/ui";

type Step = "select" | "scan" | "review" | "remember" | "export";
const STEPS: { key: Step; label: string; icon: typeof Camera }[] = [
  { key: "select", label: "Choose photos", icon: Camera },
  { key: "scan", label: "Scan", icon: ScanSearch },
  { key: "review", label: "Review", icon: ListChecks },
  { key: "remember", label: "Remember", icon: Network },
  { key: "export", label: "Export", icon: FileDown },
];

export default function ClaimsPage() {
  const session = useClaimSession();
  const [step, setStep] = useState<Step>("select");
  const itemList = Object.values(session.items);
  const reachable: Record<Step, boolean> = {
    select: true,
    scan: session.photos.length > 0,
    review: itemList.length > 0,
    remember: itemList.some((i) => i.user_confirmed),
    export: itemList.some((i) => i.user_confirmed),
  };
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  function startScan(picks: Pick[]) {
    setStep("scan");
    session.scan(picks.map(({ key, file, localUrl }) => ({ key, file, localUrl })));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claim inventory</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Only photos you pick are processed. Location data is removed before anything reaches the AI model,
            IDs and documents are skipped, and everything is deleted when you finish or close this tab.
          </p>
        </div>
        {session.sessionId && (
          <Button variant="ghost" size="sm" onClick={() => { session.endSession(); setStep("select"); }}>
            <Trash2 className="size-4" aria-hidden /> Finish and delete photos
          </Button>
        )}
      </header>

      {session.healthError && (
        <Notice tone="danger" icon={<TriangleAlert className="size-4" />}>
          Can’t reach the backend ({session.healthError}). Is it running? Start everything with <code>npm run dev</code>.
        </Notice>
      )}
      {session.health?.mock && (
        <Notice tone="warn" icon={<TriangleAlert className="size-4" />}>
          <strong>Mock mode.</strong> No API key is set, so every photo shows the same fake sofa, lamp and rug.
          Add MODEL_API_KEY to .env and restart the backend.
        </Notice>
      )}

      <nav aria-label="Progress" className="grid grid-cols-5 gap-2">
        {STEPS.map((s, i) => {
          const current = s.key === step;
          const done = i < currentIndex && reachable[s.key];
          const Icon = done ? Check : s.icon;
          return (
            <button key={s.key} disabled={!reachable[s.key] || current} onClick={() => setStep(s.key)}
              aria-current={current ? "step" : undefined}
              className="group flex flex-col gap-2 text-left disabled:cursor-default">
              <span className={`h-1 rounded-full transition-colors ${current || done ? "bg-accent" : "bg-surface-3"}`} />
              <span className={`flex items-center gap-2 text-[13px] font-semibold ${
                current ? "text-accent" : reachable[s.key] ? "text-ink group-hover:text-accent" : "text-subtle"}`}>
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {step === "select" && <SelectStep onScan={startScan} scannedCount={session.photos.length} />}
          {step === "scan" && <ScanStep session={session} onReview={() => setStep("review")} />}
          {step === "review" && (
            <ReviewStep session={session} onAddMore={() => setStep("select")} onExport={() => setStep("remember")} />
          )}
          {step === "remember" && <MemoryStep session={session} onExport={() => setStep("export")} />}
          {step === "export" && <ExportStep session={session} onBack={() => setStep("remember")} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
