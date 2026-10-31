"use client";

// Step 1: pick photos. Dates are read from EXIF here in the browser, so the user can
// filter by date range before anything is uploaded. Only selected photos leave the device.

import { useMemo, useState } from "react";
import { motion } from "motion/react";

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
const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", year: "numeric" });

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

  return (
    <div className="flex flex-col gap-5">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/60"}`}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-accent" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M21 16l-5-5-8 8" />
        </svg>
        <span className="text-lg font-medium">Choose photos from your camera roll</span>
        <span className="max-w-md text-sm text-muted">
          Birthdays, holidays, move-in day: any photo where your things are in the background. On a
          computer you can drag photos here.
        </span>
        <span className="mt-2 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink">
          {reading ? "Reading photo dates…" : picks.length ? "Add more photos" : "Choose photos"}
        </span>
        <input type="file" accept="image/*,.heic,.heif" multiple className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      </label>

      {picks.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-surface p-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted">
                {range ? `Photos from ${fmt(range[0])} to ${fmt(range[1])}` : "None of these photos has a date"}
              </span>
              <div className="flex items-center gap-2">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  min={range ? toInput(range[0]) : undefined} max={range ? toInput(range[1]) : undefined}
                  disabled={!range} className="rounded-md border border-line bg-bg px-2 py-1" aria-label="From date" />
                <span className="text-muted">to</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  min={range ? toInput(range[0]) : undefined} max={range ? toInput(range[1]) : undefined}
                  disabled={!range} className="rounded-md border border-line bg-bg px-2 py-1" aria-label="To date" />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeUndated} onChange={(e) => setIncludeUndated(e.target.checked)} />
              Include photos with no date
            </label>
            <div className="ml-auto flex gap-3 text-accent">
              <button onClick={() => setAll(true)} className="hover:underline">Select all</button>
              <button onClick={() => setAll(false)} className="hover:underline">Select none</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {picks.map((p, i) => {
              const on = p.selected && inRange(p);
              return (
                <motion.button
                  key={p.key}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: inRange(p) ? 1 : 0.25, scale: 1 }}
                  transition={{ delay: Math.min(i, 30) * 0.02 }}
                  onClick={() => setPicks((prev) => prev.map((x) => (x.key === p.key ? { ...x, selected: !x.selected } : x)))}
                  disabled={!inRange(p)}
                  className={`relative aspect-square overflow-hidden rounded-lg bg-surface-2 ring-2 ring-offset-2 ring-offset-bg transition ${
                    on ? "ring-accent" : "ring-transparent opacity-50"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={p.localUrl} alt={p.file.name} className="h-full w-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/45 px-1.5 py-0.5 text-left text-[10px] text-white">
                    {p.takenAt ? p.takenAt.toLocaleDateString() : "no date"}
                  </span>
                  {on && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-accent-ink">✓</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur sm:bottom-4">
            <span className="text-sm text-muted">
              {chosen.length} of {picks.length} selected{scannedCount ? ` · ${scannedCount} already scanned` : ""}
            </span>
            <button
              disabled={!chosen.length || reading}
              onClick={() => {
                onScan(chosen);
                setPicks((prev) => prev.filter((p) => !chosen.includes(p)));
              }}
              className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-ink disabled:opacity-40"
            >
              Scan {chosen.length} photo{chosen.length === 1 ? "" : "s"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
