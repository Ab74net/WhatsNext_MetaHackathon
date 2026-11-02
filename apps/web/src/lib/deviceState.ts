"use client";

// State that lives only on this device: localStorage when it works, an in-memory copy
// otherwise (private windows, blocked storage, quota). Nothing here is ever sent to the server.
// `initial` must be a stable (module-level) value: it doubles as the server snapshot.

import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "wn-device:";
const memory = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function read<T>(key: string, initial: T): T {
  if (memory.has(key)) return memory.get(key) as T;
  let value = initial;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw !== null) value = JSON.parse(raw) as T;
  } catch { /* storage blocked or corrupt: start fresh */ }
  memory.set(key, value);
  return value;
}

function write(key: string, value: unknown) {
  memory.set(key, value);
  try { window.localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* memory copy still works */ }
  listeners.get(key)?.forEach((l) => l());
}

export function useDeviceState<T>(key: string, initial: T) {
  const subscribe = useCallback((onChange: () => void) => {
    const set = listeners.get(key) ?? new Set();
    set.add(onChange);
    listeners.set(key, set);
    return () => { set.delete(onChange); };
  }, [key]);
  const value = useSyncExternalStore(subscribe, () => read(key, initial), () => initial);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    write(key, typeof next === "function" ? (next as (prev: T) => T)(read(key, initial)) : next);
  }, [key, initial]);
  return [value, set] as const;
}

/** Erase every value whose key starts with `scope` (for "Clear my notes"). */
export function clearDeviceState(scope: string) {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX + scope)) window.localStorage.removeItem(k);
    }
  } catch { /* nothing stored */ }
  for (const key of [...memory.keys()]) if (key.startsWith(scope)) memory.delete(key);
  listeners.forEach((set, key) => key.startsWith(scope) && set.forEach((l) => l()));
}
