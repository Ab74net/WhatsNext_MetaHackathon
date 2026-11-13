"use client";

import Link from "next/link";
import { CONCEPT_NOTICE, DEMO_STORAGE_KEY } from "@/lib/demo/config";
import { clearDeviceState } from "@/lib/deviceState";
import { THEME_KEY } from "@/lib/theme";

export function DemoBanner() {
  function reset() {
    clearDeviceState("");
    for (const [storage, keys] of [["localStorage", [DEMO_STORAGE_KEY, THEME_KEY, "tour-seen-v1"]], ["sessionStorage", ["assistant-conversation-v1"]]] as const) {
      try { for (const key of keys) window[storage].removeItem(key); } catch { /* Reload also clears the in-memory fallback. */ }
    }
    // A full reload is required to discard every provider and in-memory fallback.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }
  return <div className="demo-banner flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-line bg-blue-soft px-4 py-2 text-center text-xs text-ink" role="region" aria-label="Concept demo notice">
    <span>{CONCEPT_NOTICE} <span className="text-muted">Demo progress stays only in your browser.</span></span>
    <Link href="/about-demo" className="inline-flex min-h-9 items-center font-semibold underline">About this demo</Link>
    <button type="button" onClick={reset} className="min-h-9 font-semibold underline">Reset demo</button>
  </div>;
}
