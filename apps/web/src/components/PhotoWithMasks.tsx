import type { InventoryItem, PhotoMeta } from "@shared/types";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#db2777", "#7c3aed", "#0891b2"];

export function colorFor(index: number) {
  return COLORS[index % COLORS.length];
}

// The photo with each item's SAM mask drawn on top. The SVG viewBox uses the photo's
// own pixel size, so mask coordinates line up at any display size.
export function PhotoWithMasks({
  src,
  meta,
  items,
  highlightId,
}: {
  src: string;
  meta: PhotoMeta;
  items: InventoryItem[];
  highlightId: string | null;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element -- session photo, not a static asset */}
      <img src={src} alt={meta.filename} className="block w-full h-auto" />
      <svg
        viewBox={`0 0 ${meta.width} ${meta.height}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {items.map((item, i) => {
          const mask = item.photos.find((p) => p.photo_id === meta.photo_id)?.mask;
          if (!mask) return null;
          const { left, top, right, bottom } = mask.bounds;
          const color = colorFor(i);
          const dim = highlightId !== null && highlightId !== item.id;
          return (
            <g key={item.id} opacity={dim ? 0.15 : 1}>
              {mask.svg_path ? (
                <path
                  d={mask.svg_path}
                  transform={`translate(${left} ${top})`}
                  fill={color}
                  fillOpacity={0.35}
                  stroke={color}
                  strokeWidth={Math.max(2, meta.width / 400)}
                />
              ) : (
                <rect x={left} y={top} width={right - left} height={bottom - top}
                  fill="none" stroke={color} strokeWidth={Math.max(2, meta.width / 400)} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
