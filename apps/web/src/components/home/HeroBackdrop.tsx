"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { HERO_IMAGES, heroSrc } from "@/lib/heroImages";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

// One slide every 6 s with a 2 s crossfade: well under the three-flashes-per-second limit.
const SLIDE_MS = 6000;

// Full-bleed slow crossfade behind the homepage headline. Only the first image loads up
// front; each later one is mounted a slide before it is shown. Reduced motion: first image,
// static. A pause button satisfies WCAG 2.2.2 (moving content longer than 5 s).
export function HeroBackdrop() {
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  // index: on screen now · prev: fading out · reach: how many images are mounted
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

  const current = HERO_IMAGES[slide.index];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#161412]">
      {/* Blurred placeholder until the first image arrives. */}
      <div aria-hidden className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
        style={{ backgroundImage: `url(${HERO_IMAGES[0].blur})` }} />
      {HERO_IMAGES.slice(0, reduced ? 1 : slide.reach).map((img, i) => {
        const state = i === slide.index ? "is-active" : i === slide.prev ? "is-leaving" : "";
        return (
          // eslint-disable-next-line @next/next/no-img-element -- pre-sized webp set with srcset
          <img key={img.name} {...heroSrc(img)} sizes="100vw" alt={i === slide.index ? img.alt : ""}
            aria-hidden={i !== slide.index} decoding="async"
            loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "low"}
            className={`hero-slide ${state} ${paused ? "is-paused" : ""}`} />
        );
      })}
      {/* Darken toward the text (bottom-left) so copy stays AA-readable over any frame. */}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_16_14/0.94)_0%,rgb(18_16_14/0.7)_42%,rgb(18_16_14/0.35)_100%)]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgb(18_16_14/0.75)_0%,transparent_70%)]" />

      {!reduced && (
        <button type="button" onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play background images" : "Pause background images"}
          className="absolute right-4 top-4 z-10 inline-flex size-11 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white">
          {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
        </button>
      )}
      <p className="absolute bottom-4 right-4 z-10 text-xs uppercase tracking-[0.14em] text-white/60" aria-hidden>
        {current.hazard}
      </p>
    </div>
  );
}
