"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { setTheme, subscribeTheme, themeSnapshot } from "@/lib/theme";

// The head script applies a saved preference before paint. Read the same attribute here,
// with a light server snapshot so the icon hydrates safely even when storage is unavailable.
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, themeSnapshot, () => "light") === "dark";
  return (
    <button type="button" aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:bg-surface-2">
      {dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
