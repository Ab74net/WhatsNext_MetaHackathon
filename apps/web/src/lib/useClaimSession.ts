"use client";

// All claims-session state in one place: the backend session, each photo's progress,
// and the inventory (the server's copy is the source of truth; edits are optimistic).

import { useCallback, useEffect, useRef, useState } from "react";
import type { Health, InventoryItem, PhotoMeta, PhotoResult } from "@shared/types";
import { api, pool, type ItemPatch } from "./api";

export type ScanStatus = "queued" | "uploading" | "scanning" | "done" | "error";

export interface ScanPhoto {
  key: string;
  filename: string;
  localUrl: string; // object URL of the original file, for instant previews
  status: ScanStatus;
  meta?: PhotoMeta;
  result?: PhotoResult;
  error?: string;
}

const PARALLEL = 3;

export function useClaimSession() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ScanPhoto[]>([]);
  const [items, setItems] = useState<Record<string, InventoryItem>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch((e) => setHealthError(e instanceof Error ? e.message : String(e)));
    // Delete the session's photos when the tab closes.
    const onLeave = () => sessionRef.current && api.endSessionBeacon(sessionRef.current);
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  const update = (key: string, patch: Partial<ScanPhoto>) =>
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const scan = useCallback(async (files: { key: string; file: File; localUrl: string }[]) => {
    if (!sessionRef.current) {
      const { session_id } = await api.createSession();
      sessionRef.current = session_id;
      setSessionId(session_id);
    }
    const sid = sessionRef.current;
    setPhotos((prev) => [
      ...prev,
      ...files.map((f) => ({ key: f.key, filename: f.file.name, localUrl: f.localUrl, status: "queued" as const })),
    ]);
    await pool(files, PARALLEL, async ({ key, file }) => {
      try {
        update(key, { status: "uploading" });
        const meta = await api.uploadPhoto(sid, file);
        update(key, { meta, status: "scanning" });
        const result = await api.extract(sid, meta.photo_id);
        update(key, { result, status: "done" });
        setItems((prev) => ({ ...prev, ...Object.fromEntries(result.items.map((it) => [it.id, it])) }));
      } catch (e) {
        update(key, { status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    });
  }, []);

  const patchItem = useCallback(async (id: string, patch: ItemPatch) => {
    const sid = sessionRef.current;
    if (!sid) return;
    setItems((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    try {
      const saved = await api.patchItem(sid, id, patch);
      setItems((prev) => ({ ...prev, [id]: saved }));
    } catch {
      // Roll back to the server's copy if the edit was rejected.
      const fresh = await api.patchItem(sid, id, {}).catch(() => null);
      if (fresh) setItems((prev) => ({ ...prev, [id]: fresh }));
    }
  }, []);

  const removeItem = useCallback(async (id: string) => {
    const sid = sessionRef.current;
    if (!sid) return;
    setItems((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await api.deleteItem(sid, id).catch(() => {});
  }, []);

  const endSession = useCallback(async () => {
    if (sessionRef.current) await api.endSession(sessionRef.current).catch(() => {});
    sessionRef.current = null;
    setSessionId(null);
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.localUrl));
      return [];
    });
    setItems({});
  }, []);

  const photoUrl = (pid: string) => (sessionId ? api.photoUrl(sessionId, pid) : "");

  return { health, healthError, sessionId, photos, items, scan, patchItem, removeItem, endSession, photoUrl };
}

export type ClaimSession = ReturnType<typeof useClaimSession>;
