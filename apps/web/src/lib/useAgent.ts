"use client";

// Assistant conversation state. Kept in sessionStorage (this tab only, cleared when it
// closes) so the conversation survives a trip to the claims helper and back.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AlertsCard, CaseFile, ResourceList, Scenario, ScenarioPresetId, UIInstruction } from "@shared/types";
import { api } from "./api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  ui?: UIInstruction[];
  error?: boolean;
}

const STORE_KEY = "assistant-conversation-v1";
const DEFAULT_CASE: CaseFile = { preset: "during", home_damage: "unknown", insured: "unknown", lost_documents: "unknown" };

function load(): { messages: Message[]; caseFile: CaseFile } {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { messages: [], caseFile: DEFAULT_CASE };
}

export function useAgent() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [caseFile, setCaseFile] = useState<CaseFile>(DEFAULT_CASE);
  const [pending, setPending] = useState(false);
  const [typingId, setTypingId] = useState<string | null>(null); // reply currently being typed out
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Restore after mount (sessionStorage doesn't exist during server rendering).
    const saved = load();
    setMessages(saved.messages);
    setCaseFile(saved.caseFile);
    setLoaded(true);
    api.scenario().then(setScenario).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ messages, caseFile }));
    } catch {}
  }, [messages, caseFile, loaded]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setPending(true);
    try {
      const res = await api.agent(history.filter((m) => !m.error).map(({ role, text }) => ({ role, text })), caseFile);
      setCaseFile(res.case);
      const id = crypto.randomUUID();
      setTypingId(id);
      setMessages((prev) => [...prev, { id, role: "assistant", text: res.message, ui: res.ui }]);
    } catch (e) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant", error: true,
        text: `I couldn't respond just now (${e instanceof Error ? e.message : "network error"}). If you are in danger, call 911. For local help, call 2-1-1.`,
      }]);
    } finally {
      setPending(false);
    }
  }, [messages, caseFile, pending]);

  const doneTyping = useCallback(() => setTypingId(null), []);

  const setPreset = useCallback((preset: ScenarioPresetId) => {
    // A different point in time is a different situation: start a fresh conversation.
    setCaseFile({ ...DEFAULT_CASE, preset });
    setMessages([]);
  }, []);

  const reset = useCallback(() => setPreset(caseFile.preset), [setPreset, caseFile.preset]);

  // The map shows the most recent alerts and places the assistant returned.
  const latest = useMemo(() => {
    let alerts: AlertsCard | null = null;
    let resources: ResourceList | null = null;
    for (const m of messages) {
      for (const card of m.ui ?? []) {
        if (card.type === "alerts") alerts = card;
        if (card.type === "resources") resources = card;
      }
    }
    return { alerts, resources };
  }, [messages]);

  return { scenario, messages, caseFile, pending, typingId, doneTyping, send, setPreset, reset, ...latest };
}

export type AgentState = ReturnType<typeof useAgent>;
