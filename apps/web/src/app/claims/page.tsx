"use client";

// Claims helper: choose photos -> scan -> review -> export.

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Trash2, TriangleAlert } from "lucide-react";
import { useClaimSession } from "@/lib/useClaimSession";
import { SelectStep, type Pick } from "@/components/claims/SelectStep";
import { ScanStep } from "@/components/claims/ScanStep";
import { ReviewStep } from "@/components/claims/ReviewStep";
import { ExportStep } from "@/components/claims/ExportStep";
import { MemoryStep } from "@/components/claims/MemoryStep";
import { Button, Notice, Stepper } from "@/components/ui";
import { replaceHash, useLocationHash } from "@/lib/useLocationHash";

type Step = "select" | "scan" | "review" | "remember" | "export";
const STEPS: { key: Step; label: string }[] = [
  { key: "select", label: "Choose photos" },
  { key: "scan", label: "Scan" },
  { key: "review", label: "Review" },
  { key: "remember", label: "Memory web" },
  { key: "export", label: "Export" },
];

export default function ClaimsPage() {
  const session = useClaimSession();
  const [requestedStep, setRequestedStep] = useState<Step>("select");
  const hash = useLocationHash();
  const itemList = Object.values(session.items);
  const step: Step = hash === "#memory" ? "remember" : requestedStep === "remember" ? (itemList.length ? "review" : "select") : requestedStep;
  const setStep = useCallback((next: Step) => {
    setRequestedStep(next);
    replaceHash(next === "remember" ? "#memory" : "");
  }, []);
  const reachable: Record<Step, boolean> = {
    select: true,
    scan: session.photos.length > 0,
    review: itemList.length > 0,
    remember: itemList.some((i) => i.user_confirmed),
    export: itemList.some((i) => i.user_confirmed),
  };

  function startScan(picks: Pick[]) {
    setStep("scan");
    session.scan(picks.map(({ key, file, localUrl }) => ({ key, file, localUrl })));
  }

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-5 py-9 sm:px-9 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{step === "remember" ? "Memory Web" : "Claim inventory"}</h1>
          <p className="mt-3 text-lg text-ink sm:text-xl">{step === "remember" ? "Rebuild a complete list of what you owned." : "Turn your photos into a claim-ready list of what you owned."}</p>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Only photos you pick are processed. Location data is removed before anything reaches the AI model,
            IDs and documents are skipped, and everything is deleted when you finish or close this tab.
          </p>
        </div>
        {session.sessionId && (
          <Button variant="ghost" size="sm" loading={session.ending} onClick={async () => { if (await session.endSession()) setStep("select"); }}>
            <Trash2 className="size-4" aria-hidden /> Finish and delete photos
          </Button>
        )}
      </header>

      {session.healthError && (
        <Notice tone="danger" icon={<TriangleAlert className="size-4" />}>
          Can’t reach the backend ({session.healthError}). Is it running? Start everything with <code>npm run dev</code>.
        </Notice>
      )}
      {session.actionError && <div role="alert"><Notice tone="danger" icon={<TriangleAlert className="size-4" />}>{session.actionError}</Notice></div>}
      {session.health?.mock && (
        <Notice tone="warn" icon={<TriangleAlert className="size-4" />}>
          <strong>Mock mode.</strong> Photo results are simulated, so every photo shows the same fake sofa, lamp and rug.
          To use live models, set MODEL_API_KEY or WREN_API_KEY in .env, leave MOCK off, and restart the backend.
        </Notice>
      )}

      <Stepper steps={STEPS} current={step} reachable={reachable} onSelect={setStep} />

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {step === "select" && <SelectStep onScan={startScan} scannedCount={session.photos.length} />}
          {step === "scan" && <ScanStep session={session} onReview={() => setStep("review")} />}
          {step === "review" && (
            <ReviewStep session={session} onAddMore={() => setStep("select")} onExport={() => setStep("remember")} />
          )}
          {step === "remember" && <MemoryStep session={session} onExport={() => setStep("export")} onBack={() => setStep(itemList.length ? "review" : "select")} />}
          {step === "export" && <ExportStep session={session} onBack={() => setStep("remember")} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
