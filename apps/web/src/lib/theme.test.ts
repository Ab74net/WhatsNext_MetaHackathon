import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { resolveTheme, THEME_BOOTSTRAP } from "./theme.ts";

test("public demo starts light and preserves an explicit dark preference", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme(null, true), "light");
  assert.equal(resolveTheme(null, false), "light");
  assert.equal(resolveTheme("broken", true), "light");
});
test("before-paint bootstrap uses the same resolver, including blocked storage", () => {
  for (const saved of ["dark", "light", null, "broken", "blocked"]) for (const system of [true, false]) {
    const root = { dataset: {} as Record<string, string> };
    runInNewContext(THEME_BOOTSTRAP, { document: { documentElement: root }, localStorage: { getItem: () => { if (saved === "blocked") throw new Error("Unavailable"); return saved; } }, matchMedia: () => ({ matches: system }) });
    assert.equal(root.dataset.theme, resolveTheme(saved === "blocked" ? null : saved, system));
  }
});
