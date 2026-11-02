"use client";

import { useEffect, useState, type ReactNode } from "react";
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
export function HomeHero({ children }: { children: ReactNode }) {
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
    <div className="home-hero">
      {children}
      <div className="hero-art">
        <div aria-hidden className="hero-blue-shape" />
        <svg aria-hidden viewBox="0 0 40 40" className="hero-asterisk">
          {[0, 45, 90, 135].map((r) => (
            <line key={r} x1="20" y1="1" x2="20" y2="39" stroke="currentColor" strokeWidth="2.4" transform={`rotate(${r} 20 20)`} />
          ))}
        </svg>
        <div className="hero-photo">
        {HERO_IMAGES.slice(0, reduced ? 1 : slide.reach).map((img, i) => {
          const state = i === slide.index ? "is-active" : i === slide.prev ? "is-leaving" : "";
          return (
            // eslint-disable-next-line @next/next/no-img-element -- pre-sized webp set with srcset
            <img key={img.name} {...heroSrc(img)} sizes="(min-width: 768px) 50vw, 100vw" alt={i === slide.index ? img.alt : ""}
              aria-hidden={i !== slide.index} decoding="async"
              loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "low"}
              className={`hero-slide ${state} ${paused ? "is-paused" : ""}`} />
          );
        })}
          <div aria-hidden className="hero-coral-shape" />
        </div>
      </div>

        <div className="hero-gallery">
          {THUMBS.map((name) => {
            const i = HERO_IMAGES.findIndex((h) => h.name === name);
            const img = HERO_IMAGES[i];
            return (
              <button key={name} type="button" onClick={() => show(i)} aria-label={`Show ${img.hazard.toLowerCase()} photo`}
                aria-pressed={slide.index === i}
                className="hero-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail */}
                <img {...heroSrc(img)} sizes="(min-width: 768px) 30vw, 33vw" alt="" loading="lazy" decoding="async"
                  width={400} height={154} />
                <span>{img.hazard}</span>
              </button>
            );
          })}
        </div>
      <div className="hero-controls">
        <div className="flex gap-2" aria-hidden>
          {HERO_IMAGES.map((h, i) => (
            <span key={h.name} className={`size-2 rounded-full transition-colors ${i === slide.index ? "bg-ink" : "bg-line-strong"}`} />
          ))}
        </div>
        {!reduced && (
          <button type="button" onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play photos" : "Pause photos"}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-surface-2">
            {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}
