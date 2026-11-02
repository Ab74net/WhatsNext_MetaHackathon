"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { EMPTY_SITUATION, type AidPreparation, type AidSituation } from "@/lib/aidAutopilot";

interface AidState {
  situation: AidSituation;
  setSituation: Dispatch<SetStateAction<AidSituation>>;
  preparations: Record<string, AidPreparation>;
  setPreparations: Dispatch<SetStateAction<Record<string, AidPreparation>>>;
  agentDraft: { programName: string; text: string } | null;
  setAgentDraft: Dispatch<SetStateAction<{ programName: string; text: string } | null>>;
  hasSearched: boolean;
  setHasSearched: Dispatch<SetStateAction<boolean>>;
}
const AidContext = createContext<AidState | null>(null);

// Deliberately memory-only: no location or notes in localStorage, URLs, logs, or a database.
// The root shell keeps the draft alive during navigation. Reloading clears it.
export function AidProvider({ children }: { children: ReactNode }) {
  const [situation, setSituation] = useState<AidSituation>(EMPTY_SITUATION);
  const [preparations, setPreparations] = useState<Record<string, AidPreparation>>({});
  const [agentDraft, setAgentDraft] = useState<AidState["agentDraft"]>(null);
  const [hasSearched, setHasSearched] = useState(false);
  return <AidContext.Provider value={{ situation, setSituation, preparations, setPreparations, agentDraft, setAgentDraft, hasSearched, setHasSearched }}>{children}</AidContext.Provider>;
}
export function useAidAutopilot() {
  const context = useContext(AidContext);
  if (!context) throw new Error("Aid Autopilot requires its app provider.");
  return context;
}
