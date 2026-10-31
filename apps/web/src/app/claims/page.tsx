"use client";

// Claims helper: choose photos -> scan -> review. Export is Phase 3.

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useClaimSession } from "@/lib/useClaimSession";
import { SelectStep, type Pick } from "@/components/claims/SelectStep";
import { ScanStep } from "@/components/claims/ScanStep";
import { ReviewStep } from "@/components/claims/ReviewStep";

type Step = "select" | "scan" | "review";
const STEPS: { key: Step | "export"; label: string }[] = [
  { key: "select", label: "Choose photos" },
  { key: "scan", label: "Scan" },
  { key: "review", label: "Review" },
  { key: "export", label: "Export" },
];

export default function ClaimsPage() {
  const session = useClaimSession();
  const [step, setStep] = useState<Step>("select");
  const hasPhotos = session.photos.length > 0;
  const hasItems = Object.keys(session.items).length > 0;
  const reachable: Record<string, boolean> = { select: true, scan: hasPhotos, review: hasItems, export: false };

  function startScan(picks: Pick[]) {
    setStep("scan");
    session.scan(picks.map(({ key, file, localUrl }) => ({ key, file, localUrl })));
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Build your claim inventory</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Only photos you pick are processed. Location data is removed before anything reaches the AI
            model, photos of IDs and documents are skipped, and everything is deleted when you finish or
            close this tab.
          </p>
        </div>
        {session.sessionId && (
          <button onClick={() => { session.endSession(); setStep("select"); }}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-danger">
            Finish and delete photos
          </button>
        )}
      </header>

      {session.healthError && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          Can’t reach the backend ({session.healthError}). Is FastAPI running on port 8000? Try <code>npm run dev</code>.
        </div>
      )}
      {session.health?.mock && (
        <div className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-warn">
          <strong>Mock mode:</strong> no API key is set, so every photo shows the same fake sofa, lamp and rug.
          Add MODEL_API_KEY to .env and restart the backend.
        </div>
      )}

      <ol className="flex gap-1 overflow-x-auto text-sm">
        {STEPS.map((s, i) => {
          const current = s.key === step;
          const enabled = reachable[s.key];
          return (
            <li key={s.key} className="flex flex-1 items-center gap-1">
              <button disabled={!enabled || current} onClick={() => setStep(s.key as Step)}
                className={`flex w-full items-center gap-2 rounded-full px-3 py-1.5 whitespace-nowrap ${
                  current ? "bg-accent text-accent-ink" : enabled ? "bg-surface text-ink hover:bg-surface-2" : "text-muted/60"}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  current ? "bg-accent-ink/20" : "bg-surface-2"}`}>{i + 1}</span>
                {s.label}
                {s.key === "export" && <span className="text-[10px] opacity-70">(soon)</span>}
              </button>
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {step === "select" && <SelectStep onScan={startScan} scannedCount={session.photos.length} />}
          {step === "scan" && <ScanStep session={session} onReview={() => setStep("review")} />}
          {step === "review" && <ReviewStep session={session} onAddMore={() => setStep("select")} />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
