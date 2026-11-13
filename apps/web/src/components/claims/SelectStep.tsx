"use client";
import { Card } from "@/components/ui";
export interface Pick { key: string; file: File; localUrl: string; takenAt: Date | null; selected: boolean }
export function SelectStep({ onScan, scannedCount }: { onScan: (picks: Pick[]) => void; scannedCount: number }) {
  void onScan; void scannedCount;
  return <Card className="p-8"><h2 className="text-2xl">Choose a sample photo set</h2><p className="mt-3 text-muted">The sample gallery is being prepared. This concept demo never accepts your own photos.</p></Card>;
}
