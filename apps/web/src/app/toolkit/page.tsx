"use client";

// Recovery toolkit: two tabs, kept in the URL hash (/toolkit#documents, /toolkit#insurer-call)
// so Wren and the tour can link straight to one.

import { useCallback, useSyncExternalStore } from "react";
import { InsurerCall } from "@/components/toolkit/InsurerCall";
import { Documents } from "@/components/toolkit/Documents";

const TABS = [
  { id: "documents", label: "Documents" },
  { id: "insurer-call", label: "Insurer call" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const readTab = (): Tab => (window.location.hash === "#insurer-call" ? "insurer-call" : "documents");

export default function ToolkitPage() {
  const tab = useSyncExternalStore(subscribe, readTab, () => "documents" as Tab);
  const select = useCallback((id: Tab) => {
    history.replaceState(null, "", `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-8 lg:py-10">
      <header className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl">Recovery toolkit</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Replace lost documents in the right order, and get ready for the call with your insurance company.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- static illustration, changes with the tab */}
        <img src={tab === "documents" ? "/wren/scene-documents.webp" : "/wren/scene-clipboard.webp"} alt=""
          width={480} height={400} className="hidden w-36 shrink-0 object-contain sm:block print:hidden" />
      </header>

      <div role="tablist" aria-label="Toolkit" className="flex gap-1 border-b border-line print:hidden">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
            onClick={() => select(t.id)}
            className={`-mb-px min-h-12 border-b-2 px-4 text-[15px] font-semibold transition-colors ${
              tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "documents" ? <Documents /> : <InsurerCall />}
      </div>
    </div>
  );
}
