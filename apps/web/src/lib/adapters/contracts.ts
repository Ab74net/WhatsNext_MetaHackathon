import type { AgentResponse, CaseFile, ChatTurn, DocumentAnswer, DocumentGuide, DocumentQuestion, DocumentState, FromPhotoResult, Health, InsurerQuestions, InsurerQuestionsRequest, InventoryItem, MemoryWeb, MergeResult, PhotoMeta, PhotoResult, Scenario, ScenarioId, ScenarioSummary } from "@shared/types";

export type ExportFormat = "pdf" | "xlsx" | "csv";
export type ItemPatch = Partial<Pick<InventoryItem, "category" | "brand" | "model" | "condition" | "user_confirmed">>;
export interface AgentClient {
  scenarios(): Promise<ScenarioSummary[]>;
  scenario(id: ScenarioId): Promise<Scenario>;
  agent(messages: ChatTurn[], caseFile: CaseFile, signal?: AbortSignal): Promise<AgentResponse>;
}
export interface ScanClient {
  health(): Promise<Health>;
  createSession(): Promise<{ session_id: string }>;
  endSession(sid: string): Promise<{ deleted: boolean }>;
  endSessionBeacon(sid: string): boolean;
  uploadPhoto(sid: string, file: File): Promise<PhotoMeta>;
  photoUrl(sid: string, pid: string): string;
  extract(sid: string, pid: string): Promise<PhotoResult>;
  patchItem(sid: string, id: string, patch: ItemPatch): Promise<InventoryItem>;
  deleteItem(sid: string, id: string): Promise<{ deleted: boolean }>;
  autoMerge(sid: string): Promise<MergeResult>;
  mergeItems(sid: string, ids: string[]): Promise<InventoryItem>;
  splitItem(sid: string, id: string): Promise<InventoryItem[]>;
  valueItem(sid: string, id: string): Promise<InventoryItem>;
  memoryWeb(sid: string): Promise<MemoryWeb>;
  addFromPhoto(sid: string, file: File, category: string): Promise<FromPhotoResult>;
  exportUrl(sid: string, format: ExportFormat): string;
}
export interface ToolkitClient {
  insurerQuestions(req: InsurerQuestionsRequest): Promise<InsurerQuestions>;
  documentStates(): Promise<DocumentState[]>;
  documentGuide(state: string): Promise<DocumentGuide>;
  askDocuments(q: DocumentQuestion): Promise<DocumentAnswer>;
}
export type AppClient = AgentClient & ScanClient & ToolkitClient;
