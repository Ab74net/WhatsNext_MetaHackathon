"use client";

// The unlock path: documents in columns by dependency depth, arrows from each prerequisite.
// A node unlocks (outline turns amber) when its lost prerequisites are checked off.
// Dashed arrows: the dependency isn't stated on an official page, so confirm with the agency.

import type { DocumentEntry } from "@shared/types";
import { waitingOn } from "@/lib/documentOrder";

const W = 184, H = 60, GX = 64, GY = 18, PAD = 8;

export function DocumentPath({ entries, lost, done, onToggle }: {
  entries: DocumentEntry[]; lost: Set<string>; done: Set<string>; onToggle: (id: string) => void;
}) {
  // Depth = longest chain of lost prerequisites (entries arrive already in topological order).
  const depth = new Map<string, number>();
  for (const e of entries) {
    const pre = e.prerequisites.filter((p) => lost.has(p) && depth.has(p));
    depth.set(e.id, pre.length ? Math.max(...pre.map((p) => depth.get(p)!)) + 1 : 0);
  }
  const cols: string[][] = [];
  entries.forEach((e) => (cols[depth.get(e.id)!] ??= []).push(e.id));
  const pos = new Map<string, { x: number; y: number }>();
  cols.forEach((ids, c) => ids.forEach((id, r) => pos.set(id, { x: PAD + c * (W + GX), y: PAD + r * (H + GY) })));
  const width = PAD * 2 + cols.length * W + (cols.length - 1) * GX;
  const height = PAD * 2 + Math.max(...cols.map((c) => c.length)) * (H + GY) - GY;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-3">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Replacement path">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="var(--subtle)" />
          </marker>
        </defs>
        {entries.flatMap((e) => e.prerequisites.filter((p) => pos.has(p)).map((p) => {
          const a = pos.get(p)!, b = pos.get(e.id)!;
          const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x - 2, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
          return (
            <path key={`${p}-${e.id}`} d={`M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} fill="none"
              stroke={done.has(p) ? "var(--good)" : "var(--subtle)"} strokeWidth={1.5}
              strokeDasharray={e.prerequisites_verified ? undefined : "5 4"} markerEnd="url(#arrow)" />
          );
        }))}
        {entries.map((e) => {
          const { x, y } = pos.get(e.id)!;
          const isDone = done.has(e.id);
          const locked = !isDone && waitingOn(e, lost, done).length > 0;
          const status = isDone ? "Done" : locked ? "Waiting" : "Ready";
          return (
            <g key={e.id} transform={`translate(${x} ${y})`} role="button" tabIndex={0} aria-pressed={isDone}
              aria-label={`${e.name}: ${status}. Press to mark ${isDone ? "not done" : "done"}.`}
              onClick={() => onToggle(e.id)}
              onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onToggle(e.id); } }}
              className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[var(--ink)]">
              <rect width={W} height={H} rx={8} fill={isDone ? "var(--good-soft)" : "var(--surface-2)"}
                stroke={isDone ? "var(--good)" : locked ? "var(--line)" : "var(--accent)"} strokeWidth={2} />
              <text x={12} y={25} fontSize={14} fontWeight={600} fill="var(--ink)">{e.name.length > 22 ? `${e.name.slice(0, 21)}…` : e.name}</text>
              <text x={12} y={45} fontSize={12} fill={isDone ? "var(--good)" : locked ? "var(--muted)" : "var(--accent)"}>
                {isDone ? "✓ Done" : locked ? "Waiting on an earlier step" : "Ready to start"}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-subtle">Tap a step to mark it done. Dashed arrows: confirm this order with the agency.</p>
    </div>
  );
}
