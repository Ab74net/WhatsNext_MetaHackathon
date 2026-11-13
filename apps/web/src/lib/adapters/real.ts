// Thin client for the FastAPI backend. /api/* is forwarded to it by next.config.ts.
import type {
  AgentResponse, CaseFile, ChatTurn, DocumentAnswer, DocumentGuide, DocumentQuestion, DocumentState, FromPhotoResult,
  Health, InsurerQuestions, InsurerQuestionsRequest, InventoryItem,
  MemoryWeb, MergeResult, PhotoMeta, PhotoResult, Scenario, ScenarioId, ScenarioSummary,
} from "@shared/types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {}
    throw new ApiError(res.status, String(detail));
  }
  return res.json();
}

const json = (body: unknown): RequestInit => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export type ExportFormat = "pdf" | "xlsx" | "csv";
export type ItemPatch = Partial<Pick<InventoryItem, "category" | "brand" | "model" | "condition" | "user_confirmed">>;

export const api = {
  // Toolkit. Only non-personal fields are ever sent (the request types allow nothing else).
  insurerQuestions: (req: InsurerQuestionsRequest) =>
    call<InsurerQuestions>("/toolkit/insurer-questions", { method: "POST", ...json(req) }),
  documentStates: () => call<DocumentState[]>("/toolkit/documents"),
  documentGuide: (state: string) => call<DocumentGuide>(`/toolkit/documents/${encodeURIComponent(state)}`),
  askDocuments: (q: DocumentQuestion) => call<DocumentAnswer>("/toolkit/documents/ask", { method: "POST", ...json(q) }),
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
  patchItem: (sid: string, iid: string, patch: ItemPatch) =>
    call<InventoryItem>(`/sessions/${sid}/items/${iid}`, { method: "PATCH", ...json(patch) }),
  deleteItem: (sid: string, iid: string) =>
    call<{ deleted: boolean }>(`/sessions/${sid}/items/${iid}`, { method: "DELETE" }),
  autoMerge: (sid: string) => call<MergeResult>(`/sessions/${sid}/merge`, { method: "POST" }),
  mergeItems: (sid: string, ids: string[]) =>
    call<InventoryItem>(`/sessions/${sid}/items/merge`, { method: "POST", ...json({ ids }) }),
  splitItem: (sid: string, iid: string) =>
    call<InventoryItem[]>(`/sessions/${sid}/items/${iid}/split`, { method: "POST" }),
  valueItem: (sid: string, iid: string) =>
    call<InventoryItem>(`/sessions/${sid}/items/${iid}/value`, { method: "POST" }),
  exportUrl: (sid: string, fmt: ExportFormat) => `/api/sessions/${sid}/export.${fmt}`,
  memoryWeb: (sid: string) => call<MemoryWeb>(`/sessions/${sid}/memory-web`, { method: "POST" }),
  addFromPhoto: (sid: string, file: File, category: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    return call<FromPhotoResult>(`/sessions/${sid}/items/from-photo`, { method: "POST", body: form });
  },
  scenarios: () => call<ScenarioSummary[]>("/scenarios"),
  scenario: (id: ScenarioId) => call<Scenario>(`/scenario?id=${encodeURIComponent(id)}`),
  agent: (messages: ChatTurn[], caseFile: CaseFile, signal?: AbortSignal) =>
    call<AgentResponse>("/agent", { method: "POST", ...json({ messages, case: caseFile }), signal }),
};

// Run async tasks with at most `limit` in flight.
export async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  });
  await Promise.all(workers);
}
