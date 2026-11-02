"use client";

// All claims-session state in one place: the backend session, each photo's progress,
// the inventory (the server's copy is the source of truth; edits are optimistic),
// cross-photo merges, and price lookups.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Health, InventoryItem, MemoryWeb, MergeGroup, PhotoMeta, PhotoResult } from "@shared/types";
import { api, pool, type ExportFormat, type ItemPatch } from "./api";

export type ScanStatus = "queued" | "uploading" | "scanning" | "done" | "duplicate" | "error";

export interface ScanPhoto {
  key: string;
  filename: string;
  localUrl: string; // object URL of the original file, for instant previews
  status: ScanStatus;
  meta?: PhotoMeta;
  result?: PhotoResult;
  error?: string;
}

export type MergeState = { status: "idle" } | { status: "running" } | { status: "done"; merges: MergeGroup[] } | { status: "error"; error: string };
export type ValueState = { status: "loading" } | { status: "error"; error: string };
export type WebState = { status: "idle" } | { status: "loading" } | { status: "done"; web: MemoryWeb } | { status: "error"; error: string };

const PARALLEL = 6;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useClaimSession() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ScanPhoto[]>([]);
  const [items, setItems] = useState<Record<string, InventoryItem>>({});
  const [merge, setMerge] = useState<MergeState>({ status: "idle" });
  const [valuing, setValuing] = useState<Record<string, ValueState>>({});
  const [memory, setMemory] = useState<WebState>({ status: "idle" });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  useEffect(() => {
    api.health().then(setHealth).catch((e) => setHealthError(message(e)));
    // Delete the session's photos when the tab closes.
    const onLeave = () => sessionRef.current && api.endSessionBeacon(sessionRef.current);
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  const update = (key: string, patch: Partial<ScanPhoto>) =>
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const replaceItems = (list: InventoryItem[]) => setItems(Object.fromEntries(list.map((it) => [it.id, it])));

  const runMerge = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    setMerge({ status: "running" });
    try {
      const res = await api.autoMerge(sid);
      replaceItems(res.items);
      setMerge({ status: "done", merges: res.merges });
    } catch (e) {
      setMerge({ status: "error", error: message(e) });
    }
  }, []);

  const scan = useCallback(async (files: { key: string; file: File; localUrl: string }[]) => {
    if (!sessionRef.current) {
      const { session_id } = await api.createSession();
      sessionRef.current = session_id;
      setSessionId(session_id);
    }
    const sid = sessionRef.current;
    setMerge({ status: "idle" });
    setPhotos((prev) => [
      ...prev,
      ...files.map((f) => ({ key: f.key, filename: f.file.name, localUrl: f.localUrl, status: "queued" as const })),
    ]);
    await pool(files, PARALLEL, async ({ key, file }) => {
      try {
        update(key, { status: "uploading" });
        const meta = await api.uploadPhoto(sid, file);
        if (meta.duplicate_of) {
          // Same file already in this session: scanning it again would double-count items.
          update(key, { meta, status: "duplicate" });
          return;
        }
        update(key, { meta, status: "scanning" });
        const result = await api.extract(sid, meta.photo_id);
        update(key, { result, status: "done" });
        setItems((prev) => ({ ...prev, ...Object.fromEntries(result.items.map((it) => [it.id, it])) }));
      } catch (e) {
        update(key, { status: "error", error: message(e) });
      }
    });
    // Look for the same belongings across photos as soon as the scan finishes.
    await runMerge();
  }, [runMerge]);

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

  // "Yes, I've owned all of these": the user confirms every item found in one photo at once.
  // Still an explicit confirmation of items they can see; each can be un-confirmed in Review.
  const confirmPhoto = useCallback(async (photoId: string) => {
    const ids = Object.values(itemsRef.current)
      .filter((it) => !it.user_confirmed && it.photos.some((p) => p.photo_id === photoId))
      .map((it) => it.id);
    await Promise.all(ids.map((id) => patchItem(id, { user_confirmed: true })));
  }, [patchItem]);

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

  const mergeItems = useCallback(async (ids: string[]) => {
    const sid = sessionRef.current;
    if (!sid || ids.length < 2) return;
    const merged = await api.mergeItems(sid, ids);
    setItems((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      next[merged.id] = merged;
      return next;
    });
  }, []);

  const splitItem = useCallback(async (id: string) => {
    const sid = sessionRef.current;
    if (!sid) return;
    const parts = await api.splitItem(sid, id);
    setItems((prev) => {
      const next = { ...prev };
      delete next[id];
      parts.forEach((p) => (next[p.id] = p));
      return next;
    });
    setMerge((m) => (m.status === "done" ? { ...m, merges: m.merges.filter((g) => g.kept_id !== id) } : m));
  }, []);

  const valueItem = useCallback(async (id: string) => {
    const sid = sessionRef.current;
    if (!sid) return;
    setValuing((v) => ({ ...v, [id]: { status: "loading" } }));
    try {
      const updated = await api.valueItem(sid, id);
      setItems((prev) => ({ ...prev, [id]: updated }));
      setValuing((v) => {
        const next = { ...v };
        delete next[id];
        return next;
      });
    } catch (e) {
      setValuing((v) => ({ ...v, [id]: { status: "error", error: message(e).replace(/^\d+: /, "") } }));
    }
  }, []);

  const loadMemoryWeb = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    setMemory({ status: "loading" });
    try {
      setMemory({ status: "done", web: await api.memoryWeb(sid) });
    } catch (e) {
      setMemory({ status: "error", error: message(e) });
    }
  }, []);

  // Add a remembered item with photo evidence. Throws (with the server's reason) when the
  // item isn't found in the photo; the new item starts unconfirmed.
  const addFromPhoto = useCallback(async (file: File, category: string) => {
    const sid = sessionRef.current;
    if (!sid) throw new Error("No session");
    const { item, photo } = await api.addFromPhoto(sid, file, category);
    const result: PhotoResult = { photo_id: photo.photo_id, photo_kind: "room_or_belongings", skipped: false,
      items: [item], timings_ms: {}, warnings: [] };
    setPhotos((prev) => [...prev, { key: `remembered_${item.id}`, filename: file.name,
      localUrl: URL.createObjectURL(file), status: "done", meta: photo, result }]);
    setItems((prev) => ({ ...prev, [item.id]: item }));
    return item;
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
    setMerge({ status: "idle" });
    setValuing({});
    setMemory({ status: "idle" });
  }, []);

  const photoUrl = (pid: string) => (sessionId ? api.photoUrl(sessionId, pid) : "");
  const exportUrl = (fmt: ExportFormat) => (sessionId ? api.exportUrl(sessionId, fmt) : "#");

  return {
    health, healthError, sessionId, photos, items, merge, valuing, memory,
    scan, patchItem, confirmPhoto, removeItem, runMerge, mergeItems, splitItem, valueItem, loadMemoryWeb, addFromPhoto,
    endSession, photoUrl, exportUrl,
  };
}

export type ClaimSession = ReturnType<typeof useClaimSession>;
