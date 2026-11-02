"use client";

// Step 2: photos upload and scan in parallel; masks trace in as each photo finishes.
// When every photo is done, items are matched across photos automatically.

import { motion } from "motion/react";
import { ArrowRight, CopyCheck, Layers, LoaderCircle } from "lucide-react";
import type { ClaimSession, ScanPhoto } from "@/lib/useClaimSession";
import { PhotoWithMasks } from "@/components/PhotoWithMasks";
import { Badge, Button, Card, ProgressBar, Stat } from "@/components/ui";
import { WrenAvatar } from "@/components/Wren";

const SKIP_REASON: Record<string, string> = {
  id_or_document: "Looks like an ID or document",
  screenshot: "Looks like a screenshot",
  public_or_workplace: "Not a home (public place or workplace)",
  other: "No belongings found",
};

export function ScanStep({ session, onReview }: { session: ClaimSession; onReview: () => void }) {
  const { photos, items, merge } = session;
  const finished = photos.filter((p) => ["done", "error", "duplicate"].includes(p.status)).length;
  const skipped = photos.filter((p) => p.result?.skipped || p.status === "duplicate").length;
  const failed = photos.filter((p) => p.status === "error").length;
  const itemCount = Object.keys(items).length;
  const allDone = photos.length > 0 && finished === photos.length;
  const mergedCount = merge.status === "done" ? merge.merges.length : 0;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="flex items-center gap-3">
            <WrenAvatar mood={allDone && merge.status !== "running" ? "idle" : "searching"} size={64} />
            <p className="max-w-36 text-sm font-semibold leading-snug">
              {!allDone ? "Wren is searching your photos…" : merge.status === "running" ? "Matching items across photos…" : "All done!"}
            </p>
          </div>
          <Stat label="Photos scanned" value={`${finished}/${photos.length}`} />
          <Stat label="Items found" value={
            <motion.span key={itemCount} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-accent">
              {itemCount}
            </motion.span>} />
          <Stat label="Skipped" value={skipped} hint={failed ? `${failed} failed` : "IDs, screenshots, duplicates"} />
          <div className="ml-auto">
            <Button variant={allDone ? "primary" : "secondary"} disabled={!itemCount} onClick={onReview}>
              Review items <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <ProgressBar value={photos.length ? finished / photos.length : 0} />
        {allDone && (
          <p className="flex items-center gap-2 text-sm">
            {merge.status === "running" && (
              <><LoaderCircle className="size-4 animate-spin text-accent" aria-hidden />
                <span className="text-muted">Matching the same belongings across photos…</span></>
            )}
            {merge.status === "done" && (
              <><Layers className="size-4 text-good" aria-hidden />
                <span className="text-muted">
                  {mergedCount
                    ? <><strong className="text-ink">{mergedCount} item{mergedCount === 1 ? "" : "s"}</strong> appeared in more than one photo and were combined. You can split them in Review.</>
                    : "No item appeared in more than one photo."}
                </span></>
            )}
            {merge.status === "error" && <span className="text-warn">Couldn’t match items across photos. You can still merge them by hand in Review.</span>}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
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
  const overlay = p.status === "duplicate" ? "Same photo as one already scanned"
    : p.result?.skipped ? SKIP_REASON[p.result.photo_kind] : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden">
        <div className="relative">
          {p.meta && p.status !== "duplicate" ? (
            <PhotoWithMasks src={src} meta={p.meta} items={p.result?.items ?? []} animate />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local preview before upload
            <img src={src} alt={p.filename} className="block aspect-[3/4] w-full bg-surface-3 object-cover"
              onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
          )}
          {busy && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black/15">
              <div className="scan-sweep absolute inset-x-0 h-1/3" />
            </div>
          )}
          {overlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface/88 p-3 text-center backdrop-blur-sm">
              <CopyCheck className="size-5 text-muted" aria-hidden />
              <p className="text-xs font-semibold">{overlay}</p>
              <p className="text-[11px] text-muted">Nothing from this photo was added.</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-xs text-muted">{p.filename}</span>
          <StatusBadge photo={p} count={count} />
        </div>
        {p.error && <p className="px-3 pb-2 text-xs text-danger">{p.error}</p>}
      </Card>
    </motion.div>
  );
}

function StatusBadge({ photo: p, count }: { photo: ScanPhoto; count: number }) {
  switch (p.status) {
    case "queued": return <Badge>Waiting</Badge>;
    case "uploading": return <Badge tone="accent">Uploading</Badge>;
    case "scanning": return <Badge tone="accent" icon={<LoaderCircle className="size-3 animate-spin" />}>Scanning</Badge>;
    case "duplicate": return <Badge>Duplicate</Badge>;
    case "error": return <Badge tone="danger">Failed</Badge>;
    case "done": return p.result?.skipped ? <Badge>Skipped</Badge> : <Badge tone="good">{count} item{count === 1 ? "" : "s"}</Badge>;
  }
}
