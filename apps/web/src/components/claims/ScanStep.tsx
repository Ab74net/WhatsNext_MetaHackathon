"use client";

// Step 2: photos upload and scan in parallel; masks trace in as each photo finishes.

import { motion } from "motion/react";
import type { ClaimSession, ScanPhoto } from "@/lib/useClaimSession";
import { PhotoWithMasks } from "@/components/PhotoWithMasks";

const STATUS_LABEL: Record<ScanPhoto["status"], string> = {
  queued: "Waiting",
  uploading: "Uploading",
  scanning: "Finding items",
  done: "Done",
  error: "Failed",
};

export function ScanStep({ session, onReview }: { session: ClaimSession; onReview: () => void }) {
  const { photos, items } = session;
  const finished = photos.filter((p) => p.status === "done" || p.status === "error").length;
  const skipped = photos.filter((p) => p.result?.skipped).length;
  const failed = photos.filter((p) => p.status === "error").length;
  const itemCount = Object.keys(items).length;
  const allDone = photos.length > 0 && finished === photos.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex-1">
          <p className="font-medium">
            {allDone ? "Scan complete" : "Scanning your photos…"}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <motion.div className="h-full rounded-full bg-accent"
              animate={{ width: `${photos.length ? (finished / photos.length) * 100 : 0}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 20 }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {finished} of {photos.length} photos
            {skipped ? ` · ${skipped} skipped (ID, document or screenshot)` : ""}
            {failed ? ` · ${failed} failed` : ""}
          </p>
        </div>
        <div className="text-right">
          <motion.p key={itemCount} initial={{ scale: 1.25, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-semibold tabular-nums text-accent">
            {itemCount}
          </motion.p>
          <p className="text-xs text-muted">items found</p>
        </div>
        <button onClick={onReview} disabled={!itemCount}
          className={`rounded-full px-5 py-2.5 font-medium disabled:opacity-40 ${
            allDone ? "bg-accent text-accent-ink" : "border border-line"}`}>
          Review items →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {photos.map((p) => (
          <ScanCard key={p.key} photo={p} src={p.meta ? session.photoUrl(p.meta.photo_id) : p.localUrl} />
        ))}
      </div>
    </div>
  );
}

function ScanCard({ photo: p, src }: { photo: ScanPhoto; src: string }) {
  const busy = p.status === "queued" || p.status === "uploading" || p.status === "scanning";
  const count = p.result?.items.length ?? 0;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative">
        {p.meta ? (
          <PhotoWithMasks src={src} meta={p.meta} items={p.result?.items ?? []} animate />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- local preview before upload
          <img src={src} alt={p.filename} className="block aspect-[4/3] w-full bg-surface-2 object-cover"
            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
        )}
        {busy && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black/10">
            <div className="scan-sweep absolute inset-x-0 h-1/2" />
          </div>
        )}
        {p.result?.skipped && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/85 p-3 text-center text-xs text-muted">
            Skipped: looks like {p.result.photo_kind === "screenshot" ? "a screenshot" : p.result.photo_kind === "other" ? "it has no belongings" : "an ID or document"}. Nothing was kept.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
        <span className="truncate text-muted">{p.filename}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${
          p.status === "error" ? "bg-danger/10 text-danger"
            : p.status === "done" ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}>
          {p.status === "done" && !p.result?.skipped ? `${count} item${count === 1 ? "" : "s"}` : STATUS_LABEL[p.status]}
        </span>
      </div>
      {p.error && <p className="px-3 pb-2 text-xs text-danger">{p.error}</p>}
    </motion.div>
  );
}
