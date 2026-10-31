// Thin client for the FastAPI backend. /api/* is forwarded to it by next.config.ts.
import type { Health, PhotoMeta, PhotoResult } from "@shared/types";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {}
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json();
}

export const api = {
  health: () => call<Health>("/health"),
  createSession: () => call<{ session_id: string }>("/sessions", { method: "POST" }),
  endSession: (sid: string) => call<{ deleted: boolean }>(`/sessions/${sid}`, { method: "DELETE" }),
  // Used when the tab closes: sendBeacon can only POST.
  endSessionBeacon: (sid: string) => navigator.sendBeacon(`/api/sessions/${sid}/end`),
  uploadPhoto: async (sid: string, file: File) => {
    const form = new FormData();
    form.append("files", file);
    const [meta] = await call<PhotoMeta[]>(`/sessions/${sid}/photos`, { method: "POST", body: form });
    return meta;
  },
  photoUrl: (sid: string, pid: string) => `/api/sessions/${sid}/photos/${pid}.jpg`,
  extract: (sid: string, pid: string) =>
    call<PhotoResult>(`/sessions/${sid}/photos/${pid}/extract`, { method: "POST" }),
};

// Run async tasks with at most `limit` in flight.
export async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  });
  await Promise.all(workers);
}
