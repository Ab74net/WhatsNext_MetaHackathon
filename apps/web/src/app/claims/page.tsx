"use client";

// Phase 1 claims test page: pick photos -> upload -> extract -> review items.
// Merge, valuation and export come in Phase 3.

import { useEffect, useRef, useState } from "react";
import type { Health, PhotoMeta, PhotoResult } from "@shared/types";
import { api, pool } from "@/lib/api";
import { PhotoWithMasks, colorFor } from "@/components/PhotoWithMasks";

type Status = "uploading" | "extracting" | "done" | "error";

interface PhotoState {
  key: string;
  filename: string;
  status: Status;
  meta?: PhotoMeta;
  result?: PhotoResult;
  error?: string;
}

const PARALLEL = 3;

export default function ClaimsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const sessionRef = useRef<string | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch((e) => setHealthError(String(e.message ?? e)));
    // Delete the session's photos when the tab closes.
    const onLeave = () => sessionRef.current && api.endSessionBeacon(sessionRef.current);
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  const update = (key: string, patch: Partial<PhotoState>) =>
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  async function ensureSession() {
    if (sessionRef.current) return sessionRef.current;
    const { session_id } = await api.createSession();
    sessionRef.current = session_id;
    setSessionId(session_id);
    return session_id;
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const sid = await ensureSession();
    const batch = Array.from(files).map((file, i) => ({
      file,
      state: { key: `${Date.now()}_${i}`, filename: file.name, status: "uploading" as Status },
    }));
    setPhotos((prev) => [...prev, ...batch.map((b) => b.state)]);

    await pool(batch, PARALLEL, async ({ file, state }) => {
      try {
        const meta = await api.uploadPhoto(sid, file);
        update(state.key, { meta, status: "extracting" });
        const result = await api.extract(sid, meta.photo_id);
        update(state.key, { result, status: "done" });
      } catch (e) {
        update(state.key, { status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  async function endSession() {
    if (sessionRef.current) await api.endSession(sessionRef.current).catch(() => {});
    sessionRef.current = null;
    setSessionId(null);
    setPhotos([]);
    setConfirmed(new Set());
  }

  const toggle = (id: string) =>
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const done = photos.filter((p) => p.status === "done");
  const allItems = done.flatMap((p) => p.result!.items);
  const busy = photos.some((p) => p.status === "uploading" || p.status === "extracting");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Build your inventory</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Only the photos you pick are processed. Location data is removed before anything is sent
          to the AI model, and photos are deleted when you end the session or close this tab.
          Photos of IDs, documents and screenshots are skipped.
        </p>
      </header>

      {healthError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Backend not reachable ({healthError}). Is FastAPI running on port 8000?
        </div>
      )}
      {health?.mock && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <strong>Mock mode:</strong> no API key is set, so results are fake test data (the same
          sofa, lamp and rug on every photo). Add MODEL_API_KEY to .env and restart the backend.
        </div>
      )}
      {health && !health.mock && (
        <p className="text-xs text-zinc-500">
          Live models: {health.spark_model} + {health.sam_model}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-full bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90">
          Choose photos
          <input
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {sessionId && (
          <button onClick={endSession} disabled={busy}
            className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            End session and delete photos
          </button>
        )}
        {photos.length > 0 && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {done.length}/{photos.length} photos processed · {allItems.length} items found ·{" "}
            {confirmed.size} confirmed
          </span>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {photos.map((p) => (
          <section key={p.key} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{p.filename}</span>
              <span className="text-zinc-500">
                {p.meta?.taken_at ? `taken ${new Date(p.meta.taken_at).toLocaleDateString()}` : "no photo date"}
                {p.meta?.has_gps ? " · has location" : ""}
                {p.result ? ` · ${Object.entries(p.result.timings_ms).map(([k, v]) => `${k} ${(v / 1000).toFixed(1)}s`).join(", ")}` : ""}
              </span>
            </div>

            {p.status === "uploading" && <p className="text-sm text-zinc-500">Uploading…</p>}
            {p.status === "error" && <p className="text-sm text-red-600">Failed: {p.error}</p>}

            {p.meta && sessionId && (
              <div className="grid gap-3 md:grid-cols-[3fr_2fr]">
                <PhotoWithMasks src={api.photoUrl(sessionId, p.meta.photo_id)} meta={p.meta}
                  items={p.result?.items ?? []} highlightId={highlight} />
                <div className="flex flex-col gap-2">
                  {p.status === "extracting" && <p className="text-sm text-zinc-500">Finding items…</p>}
                  {p.result?.skipped && (
                    <p className="text-sm text-zinc-600">
                      Skipped: looks like {p.result.photo_kind === "screenshot" ? "a screenshot" : "an ID or document"}.
                      Nothing from this photo was kept.
                    </p>
                  )}
                  {p.result?.warnings.map((w) => (
                    <p key={w} className="text-xs text-amber-700 dark:text-amber-400">{w}</p>
                  ))}
                  {p.result?.items.map((item, i) => (
                    <label key={item.id}
                      onMouseEnter={() => setHighlight(item.id)} onMouseLeave={() => setHighlight(null)}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-zinc-200 p-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                      <input type="checkbox" className="mt-1" checked={confirmed.has(item.id)} onChange={() => toggle(item.id)} />
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(i) }} />
                      <span className="flex-1">
                        <span className="font-medium capitalize">{item.category}</span>
                        {(item.brand || item.model) && <span> · {[item.brand, item.model].filter(Boolean).join(" ")}</span>}
                        <span className="block text-xs text-zinc-500">
                          {item.evidence === "seen_in_photo" ? "Seen in photo" : "Inferred, not clearly visible"} ·
                          condition {item.condition} · {Math.round(item.confidence * 100)}% confident
                          {!item.photos[0]?.mask && " · no outline"}
                        </span>
                      </span>
                    </label>
                  ))}
                  {p.result && !p.result.skipped && p.result.items.length === 0 && (
                    <p className="text-sm text-zinc-500">No belongings found in this photo.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      {allItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <button onClick={() => setShowJson((s) => !s)} className="self-start text-sm underline">
            {showJson ? "Hide" : "Show"} item JSON ({allItems.length} items)
          </button>
          {showJson && (
            <pre className="max-h-96 overflow-auto rounded-md bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
              {JSON.stringify(allItems.map((it) => ({ ...it, user_confirmed: confirmed.has(it.id) })), null, 2)}
            </pre>
          )}
        </div>
      )}
    </main>
  );
}
