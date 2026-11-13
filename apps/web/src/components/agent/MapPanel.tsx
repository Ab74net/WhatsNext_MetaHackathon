"use client";

import { useState } from "react";
import { MapPin, Phone, X, ZoomIn, ZoomOut } from "lucide-react";
import type { Alert, Resource, ResourceKind, Scenario } from "@shared/types";

export const KIND_STYLE: Record<ResourceKind, { color: string; label: string; icon: string }> = {
  shelter: { color: "var(--blue)", label: "Shelter", icon: "" },
  clinic: { color: "var(--accent)", label: "Clinic", icon: "" },
  recovery_center: { color: "var(--good)", label: "Recovery help", icon: "" },
  animal_shelter: { color: "var(--pin-animal)", label: "Animals", icon: "" },
};

// An original, local schematic. No tile provider, geographic claims, or network requests.
export function MapPanel({ resources, selectedId, onSelect }: {
  scenario: Scenario | null; replayLabel: string; resources: Resource[]; liveAlerts: Alert[];
  replay: boolean; selectedId: string | null; onSelect: (id: string | null) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const selected = resources.find(r => r.id === selectedId);
  return <div className="relative flex h-full min-h-64 flex-col gap-3 overflow-hidden rounded-3xl">
    <a href="tel:911" className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-3xl bg-danger-solid font-semibold text-emergency-ink"><Phone className="size-4" aria-hidden />In danger? Call 911.</a>
    <div className="relative min-h-52 flex-1 overflow-hidden rounded-3xl border border-line bg-surface-2" aria-label="Example resource map, fictional places">
      <div className="absolute inset-0 origin-center transition-transform motion-reduce:transition-none" style={{ transform: `scale(${zoom})` }}>
        <svg viewBox="0 0 600 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
          <rect width="600" height="500" fill="var(--surface-2)" />
          <path d="M0 380C120 330 160 420 280 300S390 250 600 100" fill="none" stroke="var(--blue-soft)" strokeWidth="65" />
          <path d="M50 0L160 500M330 0L400 500M570 0L500 500M0 100L600 160M0 260L600 330M0 430L600 460" fill="none" stroke="var(--surface)" strokeWidth="24" />
          <path d="M50 0L160 500M330 0L400 500M570 0L500 500M0 100L600 160M0 260L600 330M0 430L600 460" fill="none" stroke="var(--line)" strokeWidth="1.5" />
          <rect x="210" y="25" width="90" height="65" rx="20" fill="var(--good-soft)" />
          <rect x="425" y="355" width="65" height="60" rx="20" fill="var(--good-soft)" />
        </svg>
        {resources.map((r, index) => <button key={r.id} type="button" onClick={() => onSelect(r.id)} aria-label={`Show ${r.name}, example data`} aria-pressed={selectedId === r.id}
          className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-surface text-white shadow-pop focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
          style={{ left: `${[28, 64, 46, 75][index % 4]}%`, top: `${[38, 35, 68, 72][index % 4]}%`, background: KIND_STYLE[r.kind].color }}><MapPin className="size-5" aria-hidden /></button>)}
      </div>
      <p className="absolute left-3 top-3 max-w-[70%] rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold">Example map ? Fictional places<br /><span className="font-normal text-muted">Schematic only. No live locations.</span></p>
      <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-xl border border-line bg-surface p-1">
        <button type="button" aria-label="Zoom in on example map" disabled={zoom >= 1.6} onClick={() => setZoom(z => Math.min(1.6, z + .2))} className="flex size-10 items-center justify-center disabled:opacity-40"><ZoomIn className="size-4" /></button>
        <button type="button" aria-label="Zoom out on example map" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z - .2))} className="flex size-10 items-center justify-center disabled:opacity-40"><ZoomOut className="size-4" /></button>
      </div>
      {!resources.length && <p className="absolute bottom-4 left-4 right-4 rounded-xl bg-surface p-3 text-sm text-muted">Choose a sample shelter or recovery prompt to see example pins.</p>}
      {selected && <section aria-live="polite" className="absolute bottom-3 left-3 right-3 max-w-sm rounded-2xl border border-line bg-surface p-4 shadow-pop">
        <div className="flex items-start justify-between gap-2"><h2 className="text-base font-semibold">{selected.name}</h2><button type="button" aria-label="Close example place" onClick={() => onSelect(null)} className="flex size-9 shrink-0 items-center justify-center"><X className="size-4" /></button></div>
        <p className="mt-1 text-xs text-muted">{selected.address}</p><p className="mt-2 text-xs font-semibold">Example data. Fictional place, not a real resource.</p>
      </section>}
    </div>
  </div>;
}
