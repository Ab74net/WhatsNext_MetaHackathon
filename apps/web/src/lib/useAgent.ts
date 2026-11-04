"use client";

// Assistant conversation state. Kept in sessionStorage (this tab only, cleared when it
// closes) so the conversation survives a trip to the claims helper and back.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AlertsCard, CaseFile, ResourceList, Scenario, ScenarioId, ScenarioPresetId, ScenarioSummary, UIInstruction,
} from "@shared/types";
import { api } from "./api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  ui?: UIInstruction[];
  error?: boolean;
}

const STORE_KEY = "assistant-conversation-v1";
const DEFAULT_CASE: CaseFile = {
  scenario: "spokane", preset: "during", home_damage: "unknown", insured: "unknown", lost_documents: "unknown",
};

function load(): { messages: Message[]; caseFile: CaseFile } {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { messages: saved.messages, caseFile: { ...DEFAULT_CASE, ...saved.caseFile } };
    }
  } catch {}
  return { messages: [], caseFile: DEFAULT_CASE };
}

// Aid Autopilot offers these demo details for review; it never treats them as a home address.
export function readSavedAgentCase(): CaseFile | null {
  const saved = load();
  return saved.messages?.length && ["spokane", "nrv"].includes(saved.caseFile?.scenario) ? saved.caseFile : null;
}

export function useAgent() {
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [caseFile, setCaseFile] = useState<CaseFile>(DEFAULT_CASE);
  const [pending, setPending] = useState(false);
  const [typingId, setTypingId] = useState<string | null>(null); // reply currently being typed out
  const [loaded, setLoaded] = useState(false);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const cancelPending = useCallback(() => {
    requestId.current += 1;
    controller.current?.abort();
    controller.current = null;
    setPending(false);
    setTypingId(null);
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  useEffect(() => {
    // Restore after mount (sessionStorage doesn't exist during server rendering).
    const saved = load();
    setMessages(saved.messages);
    setCaseFile(saved.caseFile);
    setLoaded(true);
    api.scenarios().then(setScenarios).catch(() => {});
  }, []);

  // Map setup, presets and suggestions for the chosen demo scenario.
  useEffect(() => {
    if (!loaded) return;
    let live = true;
    api.scenario(caseFile.scenario).then((s) => live && setScenario(s)).catch(() => {});
    return () => { live = false; };
  }, [loaded, caseFile.scenario]);

  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ messages, caseFile }));
    } catch {}
  }, [messages, caseFile, loaded]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || controller.current) return;
    const id = ++requestId.current;
    const active = new AbortController();
    controller.current = active;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setPending(true);
    try {
      const res = await api.agent(history.filter((m) => !m.error).map(({ role, text }) => ({ role, text })), caseFile, active.signal);
      if (id !== requestId.current || active.signal.aborted) return;
      setCaseFile(res.case);
      const messageId = crypto.randomUUID();
      setTypingId(messageId);
      setMessages((prev) => [...prev, { id: messageId, role: "assistant", text: res.message, ui: res.ui }]);
    } catch (e) {
      if (id !== requestId.current || active.signal.aborted) return;
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: "assistant", error: true,
        text: `I couldn't respond just now (${e instanceof Error ? e.message : "network error"}). If you are in danger, call 911. For local help, call 2-1-1.`,
      }]);
    } finally {
      if (id === requestId.current) {
        controller.current = null;
        setPending(false);
      }
    }
  }, [messages, caseFile]);

  const doneTyping = useCallback(() => setTypingId(null), []);

  const setPreset = useCallback((preset: ScenarioPresetId) => {
    // A different point in time is a different situation: start a fresh conversation.
    cancelPending();
    setCaseFile((c) => ({ ...DEFAULT_CASE, scenario: c.scenario, preset }));
    setMessages([]);
  }, [cancelPending]);

  // A different demo scenario is a different place and disaster: fresh conversation and map.
  const chooseScenario = useCallback((id: ScenarioId) => {
    cancelPending();
    setScenario(null);
    setCaseFile({ ...DEFAULT_CASE, scenario: id });
    setMessages([]);
  }, [cancelPending]);

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

  return { scenarios, scenario, messages, caseFile, pending, typingId, doneTyping, send, setPreset, chooseScenario, reset, ...latest };
}

export type AgentState = ReturnType<typeof useAgent>;
