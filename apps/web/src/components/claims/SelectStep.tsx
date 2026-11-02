"use client";

// Step 1: pick photos. Dates are read from EXIF here in the browser, so the user can
// filter by date range before anything is uploaded. Only selected photos leave the device.

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Calendar, Check, ImageUp, ScanSearch } from "lucide-react";
import { Button, Card, Pulse } from "@/components/ui";

export interface Pick {
  key: string;
  file: File;
  localUrl: string;
  takenAt: Date | null;
  selected: boolean;
}

async function readDate(file: File): Promise<Date | null> {
  try {
    // Loaded on first use: keeps it out of the initial bundle and out of server prerendering.
    const { default: exifr } = await import("exifr");
    const exif = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    const d = exif?.DateTimeOriginal ?? exif?.CreateDate;
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

const toInput = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function SelectStep({ onScan, scannedCount }: { onScan: (picks: Pick[]) => void; scannedCount: number }) {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [reading, setReading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeUndated, setIncludeUndated] = useState(true);
  const [dragging, setDragging] = useState(false);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setReading(true);
    const known = new Set(picks.map((p) => `${p.file.name}:${p.file.size}`));
    const fresh = Array.from(list).filter(
      (f) => (f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)) && !known.has(`${f.name}:${f.size}`),
    );
    const added = await Promise.all(
      fresh.map(async (file, i) => ({
        key: `${Date.now()}_${i}_${file.name}`,
        file,
        localUrl: URL.createObjectURL(file),
        takenAt: await readDate(file),
        selected: true,
      })),
    );
    setPicks((prev) => [...prev, ...added]);
    setReading(false);
  }

  const dated = picks.filter((p) => p.takenAt).map((p) => p.takenAt!.getTime());
  const range = dated.length ? [new Date(Math.min(...dated)), new Date(Math.max(...dated))] : null;

  const inRange = useMemo(() => {
    const lo = from ? new Date(from).getTime() : -Infinity;
    const hi = to ? new Date(to).getTime() + 86_400_000 : Infinity;
    return (p: Pick) => (p.takenAt ? p.takenAt.getTime() >= lo && p.takenAt.getTime() < hi : includeUndated);
  }, [from, to, includeUndated]);

  const chosen = picks.filter((p) => p.selected && inRange(p));
  const setAll = (selected: boolean) => setPicks((prev) => prev.map((p) => ({ ...p, selected })));

  const dropzone = (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      className={`flex cursor-pointer flex-col items-center gap-4 rounded-[20px] border border-dashed text-center transition-colors focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-blue ${
        picks.length ? "px-4 py-5 sm:flex-row sm:text-left" : "px-6 py-20"} ${
        dragging ? "border-accent bg-accent-soft" : "border-line hover:border-accent/60 hover:bg-surface-2"}`}
    >
      <span className={`flex shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent ${picks.length ? "size-10" : "size-14"}`}>
        {reading ? <Pulse className="size-2.5" /> : <ImageUp className="size-6" aria-hidden />}
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-display text-xl font-bold sm:text-2xl">{picks.length ? "Add more photos" : "Your photos are a place to start."}</span>
        <span className="max-w-md text-sm text-muted">
          {reading ? "Reading photo dates on your device…"
            : "Birthdays, holidays, move-in day: any photo with your things in the background. You can also drag photos here."}
        </span>
      </span>
      {!picks.length && <span className="mt-3 inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-ink">Choose photos</span>}
      <input type="file" aria-label="Choose photos from your camera roll" accept="image/*,.heic,.heif" multiple className="sr-only"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-3">{dropzone}</Card>

      {picks.length > 0 && (
        <>
          <Card className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Calendar className="size-4 text-muted" aria-hidden />
              {range ? `${fmt(range[0])} – ${fmt(range[1])}` : "No photo dates found"}
            </span>
            {range && (
              <span className="flex items-center gap-2">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  min={toInput(range[0])} max={toInput(range[1])} aria-label="From date"
                  className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px]" />
                <span className="text-muted">to</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  min={toInput(range[0])} max={toInput(range[1])} aria-label="To date"
                  className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px]" />
              </span>
            )}
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" checked={includeUndated} onChange={(e) => setIncludeUndated(e.target.checked)}
                className="size-4 accent-[var(--accent)]" />
              Include undated photos
            </label>
            <span className="ml-auto flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setAll(true)}>Select all</Button>
              <Button variant="ghost" size="sm" onClick={() => setAll(false)}>Clear</Button>
            </span>
          </Card>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-7">
            {picks.map((p, i) => {
              const allowed = inRange(p);
              const on = p.selected && allowed;
              return (
                <motion.button
                  key={p.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: allowed ? 1 : 0.3, scale: 1 }}
                  transition={{ delay: Math.min(i, 30) * 0.015 }}
                  onClick={() => setPicks((prev) => prev.map((x) => (x.key === p.key ? { ...x, selected: !x.selected } : x)))}
                  disabled={!allowed}
                  aria-pressed={on}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-surface-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={p.localUrl} alt={p.file.name}
                    className={`h-full w-full object-cover transition ${on ? "" : "opacity-50 saturate-50"}`}
                    onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                  <span className={`absolute inset-0 rounded-lg ring-inset transition ${on ? "ring-[3px] ring-accent" : "ring-0"}`} />
                  <span className={`absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full border-2 transition ${
                    on ? "border-accent bg-accent text-accent-ink" : "border-pin-ink bg-overlay/30"}`}>
                    {on && <Check className="size-3" strokeWidth={3} aria-hidden />}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 truncate bg-overlay px-1.5 pb-1 pt-4 text-left text-[10px] font-medium text-pin-ink">
                    {p.takenAt ? p.takenAt.toLocaleDateString() : "No date"}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="sticky bottom-20 z-10 lg:bottom-4">
            <Card className="flex items-center justify-between gap-3 px-4 py-3 shadow-pop">
              <span className="text-sm text-muted">
                <strong className="text-ink">{chosen.length}</strong> of {picks.length} selected
                {scannedCount ? ` · ${scannedCount} already scanned` : ""}
              </span>
              <Button variant="primary" disabled={!chosen.length || reading}
                onClick={() => {
                  onScan(chosen);
                  setPicks((prev) => prev.filter((p) => !chosen.includes(p)));
                }}>
                <ScanSearch className="size-4" aria-hidden />
                Scan {chosen.length} photo{chosen.length === 1 ? "" : "s"}
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
