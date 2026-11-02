"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "what-next-theme";
const EVENT = "app-theme-change";
function subscribe(onChange: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    document.documentElement.dataset.theme = event.newValue === "dark" ? "dark" : "light";
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", sync);
  return () => { window.removeEventListener(EVENT, onChange); window.removeEventListener("storage", sync); };
}
const snapshot = () => document.documentElement.dataset.theme === "dark";

// The head script applies a saved preference before paint. Read the same attribute here,
// with a light server snapshot so the icon hydrates safely even when storage is unavailable.
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  return (
    <button type="button" aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      onClick={() => {
        const theme = dark ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.add("theme-transition");
        window.setTimeout(() => document.documentElement.classList.remove("theme-transition"), 180);
        try { localStorage.setItem(KEY, theme); } catch { /* Theme still works for this visit. */ }
        window.dispatchEvent(new Event(EVENT));
      }}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:bg-surface-2">
      {dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
