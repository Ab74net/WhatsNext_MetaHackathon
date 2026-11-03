"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener("popstate", listener);
  return () => { window.removeEventListener("hashchange", listener); window.removeEventListener("popstate", listener); };
}
export function useLocationHash() {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => "");
}
// pushState/replaceState do not emit hashchange. Keep the URL, navigation and claim
// step synchronized without navigating away from the in-memory claims session.
export function replaceHash(hash: string) {
  if (window.location.hash !== hash) {
    history.replaceState(history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
}
