import type { AgentResponse, AlertsCard, CaseFile, PlanCard, PlanItem, Resource, ResourceList, SafetyFlowCard, UIInstruction } from "@shared/types";
import flood from "../../../../../content/safety/flood.json" with { type: "json" };
import wildfire from "../../../../../content/safety/wildfire.json" with { type: "json" };

export const SAMPLE_PROMPTS = [
  { id: "flood", text: "My home was damaged in the flood. What should I do first?" },
  { id: "shelter", text: "I need shelter tonight" },
  { id: "claim", text: "How do I start an insurance claim?" },
  { id: "aid", text: "What aid can I get? I'm a renter and lost my furniture" },
  { id: "documents", text: "How do I replace my ID?" },
  { id: "water", text: "What is the water level right now?" },
  { id: "injury", text: "I'm injured" },
  { id: "wildfire", text: "A wildfire damaged my home. What comes next?" },
  { id: "earthquake", text: "What should I do after an earthquake?" },
  { id: "plan", text: "Show me a recovery plan for today and this week" },
] as const;
export type PromptId = typeof SAMPLE_PROMPTS[number]["id"];

// Emergency terms take priority over every ordinary intent, even in mixed messages.
export function matchPrompt(text: string): PromptId | null {
  const t = text.toLowerCase();
  if (/\b(injur\w*|hurt|danger\w*|911|bleeding|trapped|unconscious)\b|can[’']?t breathe/.test(t)) return "injury";
  if (/water.{0,15}level|rising.{0,10}water|flood.{0,10}safety/.test(t)) return "water";
  if (/earthquake|aftershock|shaking|tremor/.test(t)) return "earthquake";
  if (/wildfire|\bfire\b|smoke/.test(t)) return "wildfire";
  if (/\bid\b|document|passport|birth certificate|license/.test(t)) return "documents";
  if (/aid|assistance|renter|furniture|\brent\b|food/.test(t)) return "aid";
  if (/claim|insur|inventory|belongings/.test(t)) return "claim";
  if (/shelter|tonight|place to stay|clinic/.test(t)) return "shelter";
  if (/flood/.test(t)) return "flood";
  if (/plan|today|this week|first step|what.*first/.test(t)) return "plan";
  return null;
}

export const EXAMPLE_RESOURCES: Resource[] = [
  { id: "example-shelter", kind: "shelter", name: "Riverside Community Center (example)", address: "100 Example Lane, Fictional Riverside", lat: 0, lon: 0 },
  { id: "example-clinic", kind: "clinic", name: "Meadow Clinic (example)", address: "200 Sample Street, Fictional Riverside", lat: 0, lon: 0 },
  { id: "example-recovery", kind: "recovery_center", name: "Neighborhood Recovery Hub (example)", address: "300 Demo Avenue, Fictional Riverside", lat: 0, lon: 0 },
  { id: "example-animals", kind: "animal_shelter", name: "Companion Care Center (example)", address: "400 Illustration Road, Fictional Riverside", lat: 0, lon: 0 },
].map(r => ({ ...r, phone: null, hours: null, notes: "Example data. This is not a real resource or an availability report.", source_name: "Fictional example", source_url: "", source_type: "official", checked_at: "2024-09-27" })) as Resource[];

const places: ResourceList = { type: "resources", kinds: ["shelter", "clinic", "recovery_center", "animal_shelter"], items: EXAMPLE_RESOURCES, note: "Example data. Every place and address is fictional. No opening hours, availability, or directions are provided." };

function planLine(id: string, text: string, detail: string, url: string, action: "start_claim" | null = null): PlanItem {
  return { program_id: id, text, detail, status: "pending", status_note: detail, amount: null, deadline_note: null, how: action ? [{ label: "Try the sample inventory", url: null, phone: null, action }] : [{ label: "Official guidance", url, phone: null, action: null }], action, source_name: "Official general guidance", source_url: url, checked_at: "2026-11-02" };
}
function plan(caseFile: CaseFile): PlanCard {
  return { type: "plan", phase: "recovery", phase_label: "Sample plan", based_on: caseFile,
    today: [planLine("safety", "Start with official safety instructions", "Example step: follow local officials. This demo has no current emergency information.", "https://www.ready.gov/"), planLine("insurer", "Prepare questions for an insurer", "Example step: ask about your own policy and request deadlines in writing.", "https://www.usa.gov/disaster-assistance")],
    this_week: [planLine("inventory", "Review a sample belongings inventory", "Example step: confirm each item before it enters a sample export.", "https://www.ready.gov/", "start_claim"), planLine("aid", "Check official assistance information", "Program rules, declarations, and individual circumstances need checking. This is not an eligibility decision.", "https://www.disasterassistance.gov/")],
    deadlines: [planLine("deadlines", "Check deadlines on the official page", "No current deadline is supplied by this demo. Contact the relevant provider or insurer.", "https://www.fema.gov/disaster/declarations")],
  };
}
function alerts(hazard: string): AlertsCard {
  return { type: "alerts", live: [], live_checked_at: "2024-09-27T12:00:00Z", live_source_url: "", live_error: null, fire_areas: [], fire_areas_source: null,
    recorded: [{ id: `sample-${hazard}`, title: `Sample ${hazard} bulletin`, severity: "moderate", headline: "Fictional bulletin for an example scenario.", description: "This frozen sample illustrates an alert card. It is not an actual warning, a live observation, or a report about your location.", area: "Fictional Riverside", effective: "2024-09-27T12:00:00Z", expires: "2024-09-28T12:00:00Z", source_name: "Ready.gov — general safety guidance", source_url: "https://www.ready.gov/", source_type: "official", recorded: true, geometry: null }],
  };
}
function safety(hazard: "flood" | "wildfire"): SafetyFlowCard {
  const source = hazard === "flood" ? flood : wildfire;
  return { ...source, type: "safety_flow", hazard, initial: null,
    title: `Sample ${source.title.toLowerCase()} walkthrough`,
    disclaimer: `Sample walkthrough, not current instructions. ${source.disclaimer}`,
    branches: source.branches.map(b => ({ emergency: false, ...b, steps: b.steps.map(step => ({ action: null, ...step })) })),
  } as SafetyFlowCard;
}

export function scriptedReply(text: string, caseFile: CaseFile): AgentResponse {
  const id = matchPrompt(text);
  const response = (message: string, ui: UIInstruction[]): AgentResponse => ({ message, ui: structuredClone(ui), case: caseFile, tools_used: [] });
  if (id === "injury") return response("If you are injured or in immediate danger, call 911 now.", [{ type: "emergency" }]);
  if (!id) return response("This is a concept demo with sample prompts only. Choose one below to explore a scripted response. Your message stays in this browser.", []);
  if (id === "water") return response("This demo cannot measure water levels or check current warnings. For real conditions, follow local officials and official weather channels. Here is a sample flood safety walkthrough.", [safety("flood")]);
  if (id === "shelter") return response("This example shows how resource cards could connect to a map. All places below are fictional. For real help, use official disaster sources.", [places]);
  if (id === "claim") return response("In this sample workflow, choose supplied photos, review precomputed detections, and confirm each item before exporting. No real claim is created or submitted.", [{ type: "claim_start", reason: "Try a sample photo set. No personal photos are accepted." }, { type: "toolkit_link", tab: "insurer_call", reason: "Explore a static list of questions to ask an insurer." }]);
  if (id === "aid") return response("Aid Autopilot demonstrates preparing a checklist from sample details. It does not determine eligibility, verify a declaration, or submit an application.", [{ type: "aid_link", reason: "Explore sample assistance records and a preparation checklist." }]);
  if (id === "documents") return response("The Toolkit shows a sample Virginia document replacement order. Requirements can change; check the issuing agency's official page.", [{ type: "toolkit_link", tab: "documents", reason: "Select example missing documents and explore their prerequisites." }]);
  if (id === "earthquake") return response("This example pairs a frozen bulletin with general recovery steps. It has no current earthquake or local emergency information. For actual conditions, follow local officials and Ready.gov.", [alerts("earthquake"), plan(caseFile)]);
  if (id === "wildfire") return response("Here is a scripted wildfire example with a frozen sample bulletin and a sourced safety walkthrough. No conditions or evacuation orders are checked.", [alerts("wildfire"), safety("wildfire"), plan(caseFile)]);
  return response("Here is an example recovery plan with fictional resource cards and a frozen sample alert. Nothing here describes your location or a current disaster.", [alerts("flood"), plan(caseFile), places]);
}

export async function prepareReply(text: string, caseFile: CaseFile, signal?: AbortSignal) {
  if (matchPrompt(text) === "injury") return scriptedReply(text, caseFile);
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 1000);
    signal?.addEventListener("abort", abort, { once: true });
  });
  return scriptedReply(text, caseFile);
}
