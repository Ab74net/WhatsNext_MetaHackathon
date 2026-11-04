"use client";

// All claims-session state in one place: the backend session, each photo's progress,
// the inventory (the server's copy is the source of truth; edits are optimistic),
// cross-photo merges, and price lookups.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Health, InventoryItem, MemoryWeb, MergeGroup, PhotoMeta, PhotoResult } from "@shared/types";
import { api, pool, type ExportFormat, type ItemPatch } from "./api";
import { emptyMemoryReview, emptyMemoryViewport } from "./memoryGraph";

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
export type WebState = { status: "idle" } | { status: "loading"; previous?: MemoryWeb } | { status: "done"; web: MemoryWeb } | { status: "error"; error: string; previous?: MemoryWeb };

const PARALLEL = 6;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function useClaimSession() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<ScanPhoto[]>([]);
  const [items, setItems] = useState<Record<string, InventoryItem>>({});
  const [merge, setMerge] = useState<MergeState>({ status: "idle" });
  const [valuing, setValuing] = useState<Record<string, ValueState>>({});
  const [memory, setMemory] = useState<WebState>({ status: "idle" });
  const [memoryReview, setMemoryReview] = useState(emptyMemoryReview);
  const memoryViewport = useRef(emptyMemoryViewport());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const sessionVersion = useRef(0);
  const endingRef = useRef(false);
  const removeRequests = useRef(new Set<string>());
  const removedIds = useRef(new Set<string>());
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

  const isCurrent = useCallback((sid: string, version: number) =>
    sessionRef.current === sid && sessionVersion.current === version, []);
  const replaceItems = useCallback((list: InventoryItem[]) =>
    setItems(Object.fromEntries(list.filter((it) => !removedIds.current.has(it.id)).map((it) => [it.id, it]))), []);

  const runMerge = useCallback(async () => {
    const sid = sessionRef.current;
    const version = sessionVersion.current;
    if (!sid || endingRef.current) return;
    setMerge({ status: "running" });
    try {
      const res = await api.autoMerge(sid);
      if (!isCurrent(sid, version)) return;
      replaceItems(res.items);
      setMerge({ status: "done", merges: res.merges });
    } catch (e) {
      if (!isCurrent(sid, version)) return;
      setMerge({ status: "error", error: message(e) });
    }
  }, [isCurrent, replaceItems]);

  const scan = useCallback(async (files: { key: string; file: File; localUrl: string }[]) => {
    if (endingRef.current) return;
    const version = sessionVersion.current;
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
      if (!isCurrent(sid, version)) return;
      try {
        update(key, { status: "uploading" });
        const meta = await api.uploadPhoto(sid, file);
        if (!isCurrent(sid, version)) return;
        if (meta.duplicate_of) {
          // Same file already in this session: scanning it again would double-count items.
          update(key, { meta, status: "duplicate" });
          return;
        }
        update(key, { meta, status: "scanning" });
        const result = await api.extract(sid, meta.photo_id);
        if (!isCurrent(sid, version)) return;
        update(key, { result, status: "done" });
        setItems((prev) => ({ ...prev, ...Object.fromEntries(result.items.filter((it) => !removedIds.current.has(it.id)).map((it) => [it.id, it])) }));
      } catch (e) {
        if (!isCurrent(sid, version)) return;
        update(key, { status: "error", error: message(e) });
      }
    });
    // Look for the same belongings across photos as soon as the scan finishes.
    if (isCurrent(sid, version)) await runMerge();
  }, [runMerge, isCurrent]);

  const patchItem = useCallback(async (id: string, patch: ItemPatch) => {
    const sid = sessionRef.current;
    const version = sessionVersion.current;
    if (!sid || endingRef.current || removedIds.current.has(id)) return null;
    const before = itemsRef.current[id];
    setItems((prev) => prev[id] ? { ...prev, [id]: { ...prev[id], ...patch } } : prev);
    try {
      const saved = await api.patchItem(sid, id, patch);
      if (!isCurrent(sid, version) || removedIds.current.has(id)) return null;
      setItems((prev) => prev[id] ? { ...prev, [id]: saved } : prev);
      return saved;
    } catch {
      if (!isCurrent(sid, version) || removedIds.current.has(id)) return null;
      // Roll back to the server's copy if the edit was rejected.
      const fresh = await api.patchItem(sid, id, {}).catch(() => null);
      if (!isCurrent(sid, version) || removedIds.current.has(id)) return null;
      if (fresh || before) setItems((prev) => prev[id] ? { ...prev, [id]: fresh ?? before } : prev);
      return null;
    }
  }, [isCurrent]);

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
    const version = sessionVersion.current;
    if (!sid || endingRef.current || removeRequests.current.has(id)) return false;
    removeRequests.current.add(id);
    setRemoving(new Set(removeRequests.current));
    setActionError(null);
    try {
      await api.deleteItem(sid, id);
      if (!isCurrent(sid, version)) return false;
      removedIds.current.add(id);
      setItems((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return true;
    } catch (e) {
      if (isCurrent(sid, version)) setActionError(`Couldn't remove this item (${message(e)}). It is still in your inventory. Please try again.`);
      return false;
    } finally {
      if (isCurrent(sid, version)) {
        removeRequests.current.delete(id);
        setRemoving(new Set(removeRequests.current));
      }
    }
  }, [isCurrent]);

  const mergeItems = useCallback(async (ids: string[]) => {
    const sid = sessionRef.current;
    const version = sessionVersion.current;
    if (!sid || endingRef.current || ids.length < 2) return;
    const merged = await api.mergeItems(sid, ids);
    if (!isCurrent(sid, version) || removedIds.current.has(merged.id)) return;
    setItems((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      next[merged.id] = merged;
      return next;
    });
  }, [isCurrent]);

  const splitItem = useCallback(async (id: string) => {
    const sid = sessionRef.current;
    const version = sessionVersion.current;
    if (!sid || endingRef.current) return;
    const parts = await api.splitItem(sid, id);
    if (!isCurrent(sid, version)) return;
    setItems((prev) => {
      const next = { ...prev };
      delete next[id];
      parts.filter((p) => !removedIds.current.has(p.id)).forEach((p) => (next[p.id] = p));
      return next;
    });
    setMerge((m) => (m.status === "done" ? { ...m, merges: m.merges.filter((g) => g.kept_id !== id) } : m));
  }, [isCurrent]);

  const valueItem = useCallback(async (id: string) => {
    const sid = sessionRef.current;
    const version = sessionVersion.current;
    if (!sid || endingRef.current || removedIds.current.has(id)) return;
    setValuing((v) => ({ ...v, [id]: { status: "loading" } }));
    try {
      const updated = await api.valueItem(sid, id);
      if (!isCurrent(sid, version) || removedIds.current.has(id)) return;
      setItems((prev) => {
        const current = prev[id];
        if (!current || current.category !== updated.category || current.brand !== updated.brand || current.model !== updated.model) return prev;
        return { ...prev, [id]: { ...current, estimated_replacement_usd: updated.estimated_replacement_usd } };
      });
      setValuing((v) => {
        const next = { ...v };
        delete next[id];
        return next;
      });
    } catch (e) {
      if (!isCurrent(sid, version) || removedIds.current.has(id)) return;
      setValuing((v) => ({ ...v, [id]: { status: "error", error: message(e).replace(/^\d+: /, "") } }));
    }
  }, [isCurrent]);

  const loadMemoryWeb = useCallback(async () => {
    const sid = sessionRef.current;
    const version = sessionVersion.current;
    if (!sid || endingRef.current) return;
    setMemory((old) => ({ status: "loading", previous: old.status === "done" ? old.web : old.status === "loading" || old.status === "error" ? old.previous : undefined }));
    try {
      const web = await api.memoryWeb(sid);
      if (isCurrent(sid, version)) setMemory({ status: "done", web });
    } catch (e) {
      if (!isCurrent(sid, version)) return;
      setMemory((old) => ({ status: "error", error: message(e), previous: old.status === "loading" ? old.previous : undefined }));
    }
  }, [isCurrent]);

  // Add a remembered item with photo evidence. Throws (with the server's reason) when the
  // item isn't found in the photo; the new item starts unconfirmed.
  const addFromPhoto = useCallback(async (file: File, category: string) => {
    const sid = sessionRef.current;
    const version = sessionVersion.current;
    if (!sid || endingRef.current) throw new Error("This claim session is ending. Please start a new session to add photos.");
    const { item, photo } = await api.addFromPhoto(sid, file, category);
    if (!isCurrent(sid, version)) throw new Error("This claim session has ended.");
    const result: PhotoResult = { photo_id: photo.photo_id, photo_kind: "room_or_belongings", skipped: false,
      items: [item], timings_ms: {}, warnings: [] };
    setPhotos((prev) => [...prev, { key: `remembered_${item.id}`, filename: file.name,
      localUrl: URL.createObjectURL(file), status: "done", meta: photo, result }]);
    setItems((prev) => ({ ...prev, [item.id]: item }));
    return item;
  }, [isCurrent]);

  const endSession = useCallback(async () => {
    if (endingRef.current) return false;
    endingRef.current = true;
    setEnding(true);
    setActionError(null);
    try {
      if (sessionRef.current) await api.endSession(sessionRef.current);
    } catch (e) {
      setActionError(`Couldn't confirm that your photos were deleted (${message(e)}). Your session is still open. Please try again.`);
      endingRef.current = false;
      setEnding(false);
      return false;
    }
    sessionVersion.current += 1;
    sessionRef.current = null;
    removeRequests.current.clear();
    removedIds.current.clear();
    setRemoving(new Set());
    setSessionId(null);
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.localUrl));
      return [];
    });
    setItems({});
    setMerge({ status: "idle" });
    setValuing({});
    setMemory({ status: "idle" });
    setMemoryReview(emptyMemoryReview());
    memoryViewport.current = emptyMemoryViewport();
    endingRef.current = false;
    setEnding(false);
    return true;
  }, []);

  const photoUrl = (pid: string) => (sessionId ? api.photoUrl(sessionId, pid) : "");
  const exportUrl = (fmt: ExportFormat) => (sessionId ? api.exportUrl(sessionId, fmt) : "#");

  return {
    health, healthError, actionError, ending, removing, sessionId, photos, items, merge, valuing, memory, memoryReview, setMemoryReview, memoryViewport,
    scan, patchItem, confirmPhoto, removeItem, runMerge, mergeItems, splitItem, valueItem, loadMemoryWeb, addFromPhoto,
    endSession, photoUrl, exportUrl,
  };
}

export type ClaimSession = ReturnType<typeof useClaimSession>;
