// The discovery adapter can be replaced without changing questionnaire or preparation UI.
export type AidCategory = "financial" | "housing" | "essentials";
export type AidNeed = "housing" | "belongings" | "food" | "health" | "financial" | "documents";
export type AidDisaster = "" | "flood" | "wildfire" | "hurricane" | "tornado" | "earthquake" | "other";
export interface AidSituation {
  disaster: AidDisaster;
  location: string;
  housing: "" | "rent" | "own" | "other";
  needs: AidNeed[];
  applied: "" | "no" | "yes" | "unsure";
}
export interface AidProgram {
  verified?: boolean;
  id: string;
  name: string;
  description: string;
  category: AidCategory;
  needs: AidNeed[];
  hazards: AidDisaster[];
  eligibility: string[];
  documents: string[];
  limitations: string[];
  source: { name: string; url: string; checkedAt: string };
  applicationUrl: string;
  applicationLabel: string;
}
export interface AidPreparation {
  draft?: string;
  collected: string[];
  notes: string;
  status: "Not started" | "Preparing" | "Submitted";
  saved: boolean;
}
export const EMPTY_SITUATION: AidSituation = { disaster: "", location: "", housing: "", needs: [], applied: "" };
export const EMPTY_PREPARATION: AidPreparation = { collected: [], notes: "", status: "Not started", saved: false };
export const CATEGORY_LABELS: Record<AidCategory, string> = { financial: "Financial assistance", housing: "Temporary housing", essentials: "Essential needs" };
export const NEED_LABELS: Record<AidNeed, string> = { housing: "Temporary housing", belongings: "Furniture & belongings", food: "Food & essentials", health: "Medicine & healthcare", financial: "Financial support", documents: "Replacing documents" };

const CATEGORIES = Object.keys(CATEGORY_LABELS);
const NEEDS = Object.keys(NEED_LABELS);
const HAZARDS = ["flood", "wildfire", "hurricane", "tornado", "earthquake", "other"];
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every((x) => typeof x === "string" && x.length > 0);
const https = (value: unknown) => { try { return typeof value === "string" && new URL(value).protocol === "https:"; } catch { return false; } };

export function parseAidCatalog(value: unknown): AidProgram[] {
  if (!Array.isArray(value)) throw new Error("The resource catalog is unavailable.");
  const ids = new Set<string>();
  for (const entry of value) {
    const p = entry as AidProgram;
    if (!p || ![p.id, p.name, p.description, p.applicationLabel].every((s) => typeof s === "string" && s.length)
      || ids.has(p.id) || !CATEGORIES.includes(p.category) || !strings(p.needs) || p.needs.some((n) => !NEEDS.includes(n))
      || !Array.isArray(p.hazards) || p.hazards.some((h) => !HAZARDS.includes(h))
      || !strings(p.eligibility) || !strings(p.documents) || !strings(p.limitations)
      || !p.source || typeof p.source.name !== "string" || !https(p.source.url) || !https(p.applicationUrl)
      || !/^\d{4}-\d{2}-\d{2}$/.test(p.source.checkedAt)) throw new Error("The resource catalog could not be verified. Please try again.");
    ids.add(p.id);
  }
  return value as AidProgram[];
}

// These rules narrow an illustrative catalog, never establish eligibility or availability.
export function matchAidPrograms(programs: AidProgram[], situation: AidSituation) {
  return programs.filter((p) => (!situation.disaster || !p.hazards.length || p.hazards.includes(situation.disaster))
    && (!situation.needs.length || p.needs.some((n) => situation.needs.includes(n))));
}
export interface ProgramMatcher {
  discover(situation: AidSituation, signal?: AbortSignal): Promise<{ programs: AidProgram[]; mode: "demo" }>;
}
export type AidDiscoveryAdapter = ProgramMatcher;
export const demoAidAdapter: AidDiscoveryAdapter = {
  async discover(situation, signal) {
    // No situation, notes, claim evidence, or location is sent with this request.
    const response = await fetch("/aid-programs.json", { signal });
    if (!response.ok) throw new Error("We couldn’t load the resource catalog. Please try again.");
    return { programs: matchAidPrograms(parseAidCatalog(await response.json()), situation), mode: "demo" };
  },
};

export function describeSituation(s: AidSituation): string[] {
  return [s.disaster ? s.disaster[0].toUpperCase() + s.disaster.slice(1) : "Disaster not specified",
    s.housing === "rent" ? "Renter" : s.housing === "own" ? "Homeowner" : s.housing === "other" ? "Other housing" : "Housing not specified",
    s.location || "Location not specified", ...s.needs.map((n) => NEED_LABELS[n])];
}
export function buildAidRequest(program: AidProgram | null, situation: AidSituation) {
  return `Help me prepare for ${program?.name ?? "disaster assistance"}. My confirmed situation: ${describeSituation(situation).join("; ")}.${situation.applied ? ` Already applied: ${situation.applied}.` : ""}${program ? ` Source: ${program.source.url}.` : ""} Explain general requirements and questions to ask. This is a demo resource, not verified availability. Do not treat your selected demo map region as my location, promise eligibility, invent deadlines, or submit an application.`;
}
export function preparationSummary(program: AidProgram, situation: AidSituation, prep: AidPreparation) {
  return {
    feature: "Aid Autopilot", mode: "demo", program: program.name, situation,
    status: prep.status, statusMeaning: "Self-reported tracking only; this app has not submitted or verified any application.",
    documents: program.documents.map((name) => ({ name, collected: prep.collected.includes(name) })),
    notes: prep.notes, sampleDraft: prep.draft ?? buildAidDraft(program, situation), savedLink: prep.saved ? program.applicationUrl : null,
    applicationUrl: program.applicationUrl, source: program.source,
    limitations: program.limitations, localAvailability: "Not verified", eligibility: "Not determined",
  };
}

export const AID_SAMPLE_SENTENCES = [
  "A flood damaged my rental and I lost my furniture",
  "After a wildfire, I need temporary housing",
  "After an earthquake, I need food and medicine",
] as const;

// Runs entirely locally. It narrows sample records, never infers eligibility or geocodes text.
export function interpretAidSentence(text: string): AidSituation | null {
  const t = text.toLowerCase();
  const disaster: AidDisaster = /wildfire|\bfire\b/.test(t) ? "wildfire" : /earthquake|aftershock/.test(t) ? "earthquake" : /flood/.test(t) ? "flood" : /hurricane/.test(t) ? "hurricane" : /tornado/.test(t) ? "tornado" : "";
  const needs: AidNeed[] = [];
  if (/housing|shelter|stay|displaced/.test(t)) needs.push("housing");
  if (/furniture|belongings|possessions/.test(t)) needs.push("belongings");
  if (/food|grocer/.test(t)) needs.push("food");
  if (/medicine|medication|health/.test(t)) needs.push("health");
  if (/financial|money|bills/.test(t)) needs.push("financial");
  if (/document|passport|\bid\b/.test(t)) needs.push("documents");
  if (!disaster && !needs.length) return null;
  return { ...EMPTY_SITUATION, disaster, location: "Example location (not verified)", housing: /rent/.test(t) ? "rent" : /own|homeowner/.test(t) ? "own" : "", needs };
}
export function buildAidDraft(program: AidProgram, situation: AidSituation) {
  return `SAMPLE, concept demo\nPreparation notes for ${program.name}\nExample situation: ${describeSituation(situation).join("; ")}.\nI would check the official provider's current requirements and ask which documents apply. This template is not an application, an eligibility decision, or evidence of a real loss.`;
}
