"use client";

// A small guided tour, no library. One step at a time: navigate to the step's page, spotlight
// its data-tour anchor, and show a dialog beside it (a bottom sheet on phones).
// Keyboard: focus moves into the dialog, Tab stays inside it, Escape closes, focus returns.
// "Seen" lives in localStorage, but every read and write is optional.

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { TOUR_STEPS } from "./steps";

const SEEN_KEY = "tour-seen-v1";
const CARD_W = 360;
const GAP = 12;

function readSeen() {
  try { return window.localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}
function markSeen() {
  try { window.localStorage.setItem(SEEN_KEY, "1"); } catch { /* storage blocked: the offer may show again */ }
}

const TourContext = createContext<{ start: () => void }>({ start: () => {} });
export const useTour = () => useContext(TourContext);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<number | null>(null);
  const [offer, setOffer] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  // Offer (never force) the tour once, a moment after the first visit settles.
  useEffect(() => {
    const t = setTimeout(() => { if (!readSeen()) setOffer(true); }, 1200);
    return () => clearTimeout(t);
  }, []);

  const start = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setOffer(false);
    markSeen();
    setStep(0);
  }, []);

  const close = useCallback(() => {
    setStep(null);
    markSeen();
    // The opener may be gone (the first-visit offer unmounts); fall back to the nav link.
    const back = opener.current?.isConnected ? opener.current : document.querySelector<HTMLElement>("[data-tour-link]");
    back?.focus?.();
  }, []);

  return (
    <TourContext.Provider value={{ start }}>
      {children}
      {step !== null && <TourDialog step={step} setStep={setStep} onClose={close} />}
      {offer && step === null && (
        <TourOffer onStart={start} onDismiss={() => { setOffer(false); markSeen(); }} />
      )}
    </TourContext.Provider>
  );
}

function TourOffer({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  return (
    <div role="region" aria-label="Guided tour"
      className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-sm rounded-2xl border border-line bg-surface p-4 shadow-pop lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static illustration */}
        <img src="/wren/scene-guide.webp" alt="" width={480} height={351} className="w-20 shrink-0" />
        <div>
          <p className="font-display text-lg leading-snug">New here?</p>
          <p className="mt-1 text-sm text-muted">A one-minute tour shows how to ask for help and build your claim list.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" size="sm" onClick={onStart}>Take the tour</Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>No thanks</Button>
      </div>
    </div>
  );
}

type Rect = { top: number; left: number; width: number; height: number };

function TourDialog({ step, setStep, onClose }: {
  step: number; setStep: (n: number) => void; onClose: () => void;
}) {
  const s = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length - 1;
  const router = useRouter();
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(1024);
  const [vh, setVh] = useState(768);

  // Go to the step's page.
  useEffect(() => {
    if (pathname !== s.path) router.push(s.path);
  }, [s.path, pathname, router]);

  // Track the anchor every frame (it may mount late, move, or resize), and scroll it into view once.
  useEffect(() => {
    let raf = 0;
    let scrolled = false;
    let prev = "";
    const tick = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${s.anchor}"]`);
      if (el && !scrolled) {
        el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
        scrolled = true;
      }
      const r = el?.getBoundingClientRect();
      const next = r && r.width > 0 ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      const key = `${JSON.stringify(next)}|${window.innerWidth}|${window.innerHeight}`;
      if (key !== prev) {
        prev = key;
        setRect(next);
        setVw(window.innerWidth);
        setVh(window.innerHeight);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s.anchor, reduced]);

  // Focus the dialog heading on every step so screen readers announce it.
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [step]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key !== "Tab") return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [])];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const lastEl = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault(); first.focus();
    }
  }

  const phone = vw < 640;
  const pad = 6;
  let cardStyle: React.CSSProperties;
  if (phone) {
    // Dock at whichever edge keeps the highlighted element visible.
    const lowTarget = rect && rect.top + rect.height / 2 > vh / 2 && rect.height < vh / 2;
    cardStyle = lowTarget ? { left: 16, right: 16, top: 64 } : { left: 16, right: 16, bottom: 16 };
  } else if (rect && vh - (rect.top + rect.height) > 240) {
    cardStyle = { top: rect.top + rect.height + pad + GAP, left: clampLeft(rect.left, vw) };
  } else if (rect && rect.top > 240) {
    cardStyle = { bottom: vh - rect.top + pad + GAP, left: clampLeft(rect.left, vw) };
  } else if (rect) {
    // Large anchor (the map, the message list): sit inside its lower-left corner.
    cardStyle = { bottom: Math.max(16, vh - (rect.top + rect.height) + 16), left: clampLeft(rect.left + 16, vw) };
  } else {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  const ease = reduced ? "" : "transition-all duration-300 ease-out";

  return (
    <div className="fixed inset-0 z-50" onKeyDown={onKeyDown}>
      {/* Click-catcher: the page underneath is inert during the tour. */}
      <div className={`absolute inset-0 ${rect ? "" : "bg-black/60"}`} aria-hidden />
      {rect && (
        <div aria-hidden className={`pointer-events-none absolute rounded-lg ring-2 ring-accent ${ease}`}
          style={{
            top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgb(10 9 8 / 0.62)",
          }} />
      )}
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}
        className={`absolute rounded-2xl border border-line bg-surface p-5 shadow-pop ${ease}`}
        style={{ width: phone ? undefined : CARD_W, ...cardStyle }}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium tracking-wide text-muted">
            Step {step + 1} of {TOUR_STEPS.length}
          </p>
          <button type="button" onClick={onClose} aria-label="Close tour"
            className="-m-2 inline-flex size-10 items-center justify-center rounded-md text-muted hover:text-ink">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <h2 id={titleId} tabIndex={-1} className="mt-1 font-display text-xl leading-snug outline-none">{s.title}</h2>
        <p id={bodyId} className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
        <div className="mt-4 flex gap-1" aria-hidden>
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Skip tour</Button>
          <span className="flex-1" />
          {step > 0 && <Button size="sm" onClick={() => setStep(step - 1)}>Back</Button>}
          <Button variant="primary" size="sm" onClick={() => (last ? onClose() : setStep(step + 1))}>
            {last ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function clampLeft(left: number, vw: number) {
  return Math.min(Math.max(16, left), vw - CARD_W - 16);
}
