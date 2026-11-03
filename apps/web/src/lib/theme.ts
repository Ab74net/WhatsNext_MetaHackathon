export type Theme = "light" | "dark";
export const THEME_KEY = "what-next-theme";
export const THEME_EVENT = "app-theme-change";
export function resolveTheme(saved: string | null, systemDark: boolean): Theme {
  return saved === "light" || saved === "dark" ? saved : systemDark ? "dark" : "light";
}

// This exact resolver also runs before paint; startup and the live toggle share one policy.
export const THEME_BOOTSTRAP = `(()=>{const resolve=${resolveTheme.toString()};let saved=null;try{saved=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch{}document.documentElement.dataset.theme=resolve(saved,matchMedia('(prefers-color-scheme: dark)').matches)})()`;

let manual: Theme | null = null;
function savedTheme(): string | null {
  if (manual) return manual;
  try { return window.localStorage.getItem(THEME_KEY) ?? manual; } catch { return manual; }
}
function apply(theme: Theme, animate = false) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", getComputedStyle(root).getPropertyValue("--canvas").trim());
  if (animate) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 180);
  }
}
export function setTheme(theme: Theme) {
  manual = theme;
  try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* An in-memory choice still overrides the OS for this visit. */ }
  apply(theme, true);
  window.dispatchEvent(new Event(THEME_EVENT));
}
export function subscribeTheme(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const syncSystem = () => { apply(resolveTheme(savedTheme(), media.matches)); onChange(); };
  const syncStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    manual = event.newValue === "light" || event.newValue === "dark" ? event.newValue : null;
    syncSystem();
  };
  syncSystem();
  media.addEventListener("change", syncSystem);
  window.addEventListener("storage", syncStorage);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", syncSystem);
    window.removeEventListener("storage", syncStorage);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}
export const themeSnapshot = (): Theme => document.documentElement.dataset.theme === "dark" ? "dark" : "light";
