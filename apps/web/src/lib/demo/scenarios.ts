import type { Scenario, ScenarioId } from "@shared/types";

export function sampleScenario(id: ScenarioId): Scenario {
  const flood = id === "nrv";
  return {
    id, title: flood ? "Example flood" : "Example wildfire", hypothetical: true,
    hazard: flood ? "flood" : "wildfire", place: "Riverside (fictional example)",
    center: [0, 0], zoom: 12,
    summary: "Explore a fictional recovery situation with scripted responses and example places.",
    summary_sources: [], suggestions: { during: [], recovery: [] },
    presets: [{ id: "during", label: "Sample first steps", clock: null, phase: "response", replay: false },
      { id: "recovery", label: "Sample recovery", clock: null, phase: "recovery", replay: false }],
    fire_areas: { type: "FeatureCollection", features: [], source: null },
  };
}
