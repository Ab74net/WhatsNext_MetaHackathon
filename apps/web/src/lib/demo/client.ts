import brand from "@shared/brand.json";
import guide from "../../../../../content/documents/virginia.json";
import type { DocumentGuide } from "@shared/types";
import type { AppClient } from "../adapters/contracts";
import { sampleScenario } from "./scenarios";
import { prepareReply } from "./prompts";

const unavailable = async (): Promise<never> => { throw new Error("Only the supplied sample photos are supported in this concept demo."); };

// No fetch, beacon, model SDK, or backend URL belongs in this adapter.
export const demoApi: AppClient = {
  health: async () => ({ ok: true, mock: true, spark_model: "Simulated", sam_model: "Simulated", project_name: brand.projectName, agent_name: brand.agentName }),
  scenarios: async () => [sampleScenario("nrv"), sampleScenario("spokane")],
  scenario: async (id) => sampleScenario(id),
  agent: async (messages, caseFile, signal) => prepareReply(messages.filter(m => m.role === "user").at(-1)?.text ?? "", caseFile, signal),
  documentStates: async () => [{ state: "VA", state_name: "Virginia", available: true }, { state: "WA", state_name: "Washington", available: false }],
  documentGuide: async () => structuredClone({ ...guide, documents: guide.documents.map((entry) => Object.assign({
    prerequisites_note: "", disaster_waiver_note: "", fees_note: "", timing_note: "", id_card_note: "", phone: "",
  }, entry)) }) as unknown as DocumentGuide,
  askDocuments: async (q) => ({ answer: "Sample response: requirements can change. Use the official agency links in the selected entries to check current information. This demo does not generate personalized answers.", doc_ids: q.doc_ids, covered: false }),
  insurerQuestions: async () => ({ tailored: false, questions: [
    { text: "Does my policy cover temporary housing while my home is repaired or rebuilt?", why: "Ask what costs are included and for how long." },
    { text: "Is my contents coverage replacement cost or actual cash value?", why: "Ask how items are valued." },
    { text: "What is my deductible?", why: "Ask how it applies to the home and contents." },
    { text: "What is the deadline to submit my inventory?", why: "Ask for the date in writing." },
    { text: "Can I get an advance payment?", why: "Ask your insurer about its process." },
    { text: "Who is my adjuster and how do I reach them?", why: "Write down their contact details." },
  ] }),
  createSession: unavailable, uploadPhoto: unavailable, extract: unavailable, patchItem: unavailable,
  deleteItem: unavailable, autoMerge: unavailable, mergeItems: unavailable, splitItem: unavailable,
  valueItem: unavailable, memoryWeb: unavailable, addFromPhoto: unavailable,
  endSession: async () => ({ deleted: true }), endSessionBeacon: () => true,
  photoUrl: () => "", exportUrl: () => "#",
};
