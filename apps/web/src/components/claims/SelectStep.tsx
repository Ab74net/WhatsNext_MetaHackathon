"use client";
import { useState } from "react";
import { ScanSearch } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { SAMPLE_SETS, samplePhoto } from "@/lib/demo/samples";
export interface Pick { key: string; file: File; localUrl: string; takenAt: Date | null; selected: boolean }
export function SelectStep({ onScan, scannedCount }: { onScan: (picks: Pick[]) => void; scannedCount: number }) {
  const [selected, setSelected] = useState<string>("living");
  function scan() {
    const set = SAMPLE_SETS.find(s => s.id === selected)!;
    onScan(set.photos.map(id => ({ key: crypto.randomUUID(), file: new File([], `${id}.webp`, { type: "image/webp" }), localUrl: samplePhoto(id).src, takenAt: null, selected: true })));
  }
  return <div className="flex flex-col gap-5">
    <div><h2 className="text-2xl">Choose a sample photo set</h2><p className="mt-2 max-w-2xl text-sm text-muted">Supplied example images, not a real household or your belongings. The animation reveals precomputed results. Your own photos are never accepted.</p></div>
    <div className="grid gap-4 md:grid-cols-3" role="group" aria-label="Sample photo sets">
      {SAMPLE_SETS.map(set => {
        const photo = samplePhoto(set.photos[0]);
        return <button type="button" key={set.id} aria-pressed={selected === set.id} data-sample-set={set.id} onClick={() => setSelected(set.id)} className={`overflow-hidden rounded-3xl border bg-surface text-left transition hover:border-ink ${selected === set.id ? "border-accent ring-2 ring-accent" : "border-line"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- optimized local fixtures */}
          <img src={photo.thumbnail} alt={photo.alt} width={360} height={280} loading="lazy" className="aspect-[4/3] w-full object-cover" />
          <span className="block p-5"><span className="block font-display text-xl font-bold">{set.name}</span><span className="mt-2 block text-sm text-muted">{set.description}</span><span className="mt-3 block text-xs font-semibold text-accent">{set.photos.length} sample views · Simulated scan</span></span>
        </button>;
      })}
    </div>
    <Card className="flex flex-wrap items-center justify-between gap-4 p-5"><p className="text-sm text-muted">{scannedCount ? `${scannedCount} sample views already explored. ` : ""}Six supplied originals across three sets. The living-room detail is a crop of its wide image.</p><Button variant="primary" onClick={scan}><ScanSearch className="size-4" aria-hidden />Simulate scan</Button></Card>
  </div>;
}
