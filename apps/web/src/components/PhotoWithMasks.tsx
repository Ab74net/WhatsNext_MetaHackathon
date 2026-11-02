import type { InventoryItem, Mask, PhotoMeta } from "@shared/types";

const COLORS = ["#2f7fa6", "#e5533d", "#1f7a45", "#8a5300", "#1f5e7e", "#c2381f"];

export function colorFor(index: number) {
  return COLORS[index % COLORS.length];
}

function strokeFor(width: number) {
  return Math.max(2, width / 300);
}

// One mask as SVG. Paths are in mask-local coordinates, so translate by the bounds.
// pathLength=1 lets the CSS "mask-draw" animation trace any outline in the same time.
function MaskShape({ mask, color, width, animate, delayMs = 0 }: {
  mask: Mask; color: string; width: number; animate: boolean; delayMs?: number;
}) {
  const { left, top, right, bottom } = mask.bounds;
  const common = {
    fill: color,
    fillOpacity: 0.3,
    stroke: color,
    strokeWidth: strokeFor(width),
    pathLength: 1,
    className: animate ? "mask-draw" : undefined,
    style: animate ? { animationDelay: `${delayMs}ms, ${delayMs + 600}ms` } : undefined,
  };
  return mask.svg_path ? (
    <path d={mask.svg_path} transform={`translate(${left} ${top})`} {...common} />
  ) : (
    <rect x={left} y={top} width={right - left} height={bottom - top} {...common} fillOpacity={0} />
  );
}

// The photo with each item's SAM mask drawn on top. The SVG viewBox uses the photo's
// own pixel size, so mask coordinates line up at any display size.
export function PhotoWithMasks({
  src,
  meta,
  items,
  highlightId = null,
  animate = false,
  fit = false,
  className = "",
}: {
  src: string;
  meta: PhotoMeta;
  items: InventoryItem[];
  highlightId?: string | null;
  animate?: boolean;
  fit?: boolean; // scale the whole photo to fit the screen height (viewer) instead of filling the width
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${fit ? "mx-auto w-fit" : ""} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- session photo, not a static asset */}
      <img src={src} alt={meta.filename}
        className={fit ? "block max-h-[72vh] w-auto max-w-full" : "block h-auto w-full"} />
      <svg viewBox={`0 0 ${meta.width} ${meta.height}`} className="pointer-events-none absolute inset-0 h-full w-full">
        {items.map((item, i) => {
          const mask = item.photos.find((p) => p.photo_id === meta.photo_id)?.mask;
          if (!mask) return null;
          const dim = highlightId !== null && highlightId !== item.id;
          return (
            <g key={item.id} opacity={dim ? 0.12 : 1} className="transition-opacity">
              <MaskShape mask={mask} color={colorFor(i)} width={meta.width} animate={animate} delayMs={i * 140} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// A thumbnail zoomed to one item's mask: the viewBox crops the full photo to the
// padded bounds, so no image processing is needed.
export function ItemCrop({ src, meta, mask, color }: { src: string; meta: PhotoMeta; mask: Mask | null; color: string }) {
  let box = [0, 0, meta.width, meta.height];
  if (mask) {
    const { left, top, right, bottom } = mask.bounds;
    const pad = Math.max(right - left, bottom - top) * 0.15;
    const x = Math.max(0, left - pad);
    const y = Math.max(0, top - pad);
    box = [x, y, Math.min(meta.width, right + pad) - x, Math.min(meta.height, bottom + pad) - y];
  }
  return (
    <svg viewBox={box.join(" ")} preserveAspectRatio="xMidYMid slice" className="h-full w-full bg-surface-2">
      <image href={src} width={meta.width} height={meta.height} />
      {mask && <MaskShape mask={mask} color={color} width={box[2] * 1.5} animate={false} />}
    </svg>
  );
}
