"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Content is visible even without JavaScript. Motion is a small enhancement on entry,
// never a prerequisite for reading the article or loading its photographs.
export function StoryReveals({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (media.matches) continue;
        const animation = entry.target.animate([
          { opacity: .65, transform: "translateY(12px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 500, easing: "cubic-bezier(.2,.7,.2,1)" });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: .08 });
    root.current?.querySelectorAll("[data-story-reveal]").forEach((element) => observer.observe(element));
    const stop = () => { if (media.matches) animations.forEach((animation) => animation.cancel()); };
    media.addEventListener("change", stop);
    return () => { observer.disconnect(); animations.forEach((animation) => animation.cancel()); media.removeEventListener("change", stop); };
  }, []);
  return <div ref={root}>{children}</div>;
}
