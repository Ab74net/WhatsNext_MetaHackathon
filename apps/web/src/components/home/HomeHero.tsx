"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { HERO_IMAGES, heroSrc } from "@/lib/heroImages";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// One slide every 6 s with a 2 s crossfade: well under the three-flashes-per-second limit.
const SLIDE_MS = 6000;
// Thumbnails along the bottom, as in the mockup.
const THUMBS = ["flood", "hurricane", "tornado"];

// Homepage hero art: the disaster photos crossfade inside an organic mask, with flat blue and
// coral shapes and an asterisk behind. Only the first photo loads up front; each later one
// mounts a slide early. Reduced motion: the first photo, static. A pause button covers WCAG 2.2.2.
export function HomeHero() {
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [slide, setSlide] = useState({ index: 0, prev: -1, reach: 2 });
  const running = !reduced && !paused;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSlide(({ index, reach }) => {
      const next = (index + 1) % HERO_IMAGES.length;
      return { index: next, prev: index, reach: Math.min(HERO_IMAGES.length, Math.max(reach, next + 2)) };
    }), SLIDE_MS);
    return () => clearInterval(t);
  }, [running]);

  const show = (i: number) => setSlide(({ index, reach }) =>
    i === index ? { index, prev: -1, reach } : { index: i, prev: index, reach: Math.min(HERO_IMAGES.length, Math.max(reach, i + 2)) });

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      {/* Flat decoration: never behind text, smaller on phones. */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-10 h-56 w-72 rotate-[-18deg] rounded-[60%_40%_55%_45%/55%_45%_55%_45%] bg-deco-blue sm:h-72 sm:w-96" />
      <div aria-hidden className="pointer-events-none absolute -right-2 top-10 hidden size-20 rounded-full border-[14px] border-white sm:block" />
      <div aria-hidden className="pointer-events-none absolute -bottom-6 -left-8 h-32 w-40 rotate-[24deg] rounded-[30%_70%_40%_60%/60%_30%_70%_40%] bg-deco-coral" />
      <svg aria-hidden viewBox="0 0 40 40" className="pointer-events-none absolute -left-2 -top-4 size-10 text-ink sm:size-14">
        {[0, 30, 60, 90, 120, 150].map((r) => (
          <line key={r} x1="20" y1="2" x2="20" y2="38" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${r} 20 20)`} />
        ))}
      </svg>

      <div className="relative aspect-[5/4] overflow-hidden rounded-[44%_56%_38%_62%/52%_42%_58%_48%] bg-surface-3">
        <div aria-hidden className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
          style={{ backgroundImage: `url(${HERO_IMAGES[0].blur})` }} />
        {HERO_IMAGES.slice(0, reduced ? 1 : slide.reach).map((img, i) => {
          const state = i === slide.index ? "is-active" : i === slide.prev ? "is-leaving" : "";
          return (
            // eslint-disable-next-line @next/next/no-img-element -- pre-sized webp set with srcset
            <img key={img.name} {...heroSrc(img)} sizes="(min-width: 1024px) 50vw, 100vw" alt={i === slide.index ? img.alt : ""}
              aria-hidden={i !== slide.index} decoding="async"
              loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "low"}
              className={`hero-slide ${state} ${paused ? "is-paused" : ""}`} />
          );
        })}
      </div>

      <div className="relative mt-5 flex items-end gap-3">
        <div className="grid flex-1 grid-cols-3 gap-3">
          {THUMBS.map((name) => {
            const i = HERO_IMAGES.findIndex((h) => h.name === name);
            const img = HERO_IMAGES[i];
            return (
              <button key={name} type="button" onClick={() => show(i)} aria-label={`Show ${img.hazard.toLowerCase()} photo`}
                aria-pressed={slide.index === i}
                className={`overflow-hidden rounded-2xl border-2 transition-colors ${slide.index === i ? "border-ink" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail */}
                <img {...heroSrc(img)} sizes="200px" alt="" loading="lazy" decoding="async"
                  width={240} height={150} className="aspect-[16/10] w-full object-cover" />
              </button>
            );
          })}
        </div>
        {!reduced && (
          <button type="button" onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play photos" : "Pause photos"}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-surface-2">
            {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          </button>
        )}
      </div>
      <div className="mt-3 flex justify-center gap-2" aria-hidden>
        {HERO_IMAGES.map((h, i) => (
          <span key={h.name} className={`size-2 rounded-full transition-colors ${i === slide.index ? "bg-ink" : "bg-line-strong"}`} />
        ))}
      </div>
    </div>
  );
}
