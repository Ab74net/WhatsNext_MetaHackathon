import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { buildAidRequest, EMPTY_PREPARATION, EMPTY_SITUATION, matchAidPrograms, parseAidCatalog, preparationSummary } from "./aidAutopilot.ts";

const catalog = parseAidCatalog(JSON.parse(readFileSync(new URL("../../public/aid-programs.json", import.meta.url), "utf8")));

test("all answers are optional and do not exclude the initial catalog", () => {
  assert.equal(matchAidPrograms(catalog, EMPTY_SITUATION).length, catalog.length);
});
test("flood belongings search offers preparation paths without establishing eligibility", () => {
  const matches = matchAidPrograms(catalog, { ...EMPTY_SITUATION, disaster: "flood", location: "Florida", housing: "rent", needs: ["belongings"] });
  assert.ok(matches.some((p) => p.id === "flood-insurance"));
  assert.ok(matches.some((p) => p.id === "fema-ia"));
  assert.ok(matches.every((p) => p.limitations.length > 0));
});
test("wildfire searches exclude the flood-policy pathway", () => {
  assert.equal(matchAidPrograms(catalog, { ...EMPTY_SITUATION, disaster: "wildfire" }).some((p) => p.id === "flood-insurance"), false);
});
test("food needs narrow results and an unspecified location never fabricates local matches", () => {
  const matched = matchAidPrograms(catalog, { ...EMPTY_SITUATION, needs: ["food"] });
  assert.ok(matched.some((p) => p.id === "disaster-food"));
  assert.ok(matched.every((p) => p.needs.includes("food")));
  assert.deepEqual(matched, matchAidPrograms(catalog, { ...EMPTY_SITUATION, location: "Unmapped place", needs: ["food"] }));
});
test("catalog rejects unsafe application links, duplicate IDs, and malformed records", () => {
  assert.throws(() => parseAidCatalog([{ ...catalog[0], applicationUrl: "javascript:alert(1)" }]));
  assert.throws(() => parseAidCatalog([catalog[0], catalog[0]]));
  assert.throws(() => parseAidCatalog([{ ...catalog[0], documents: [] }]));
  assert.throws(() => parseAidCatalog(null));
  assert.deepEqual(parseAidCatalog([]), []);
});
test("completed checklists never turn preparation into submission", () => {
  const p = catalog[0];
  const prep = { ...EMPTY_PREPARATION, collected: p.documents, notes: "Question for the provider", saved: true };
  const summary = preparationSummary(p, EMPTY_SITUATION, prep);
  assert.equal(summary.status, "Not started");
  assert.ok(summary.documents.every((d) => d.collected));
  assert.equal(summary.savedLink, p.applicationUrl);
  assert.equal(summary.eligibility, "Not determined");
  assert.match(preparationSummary(p, EMPTY_SITUATION, { ...prep, status: "Submitted" }).statusMeaning, /has not submitted/);
});
test("assistant handoff excludes private preparation notes and asks for general guidance", () => {
  const situation = { ...EMPTY_SITUATION, location: "Florida" };
  const prompt = buildAidRequest(catalog[0], situation);
  assert.match(prompt, /Florida/);
  assert.match(prompt, /not verified availability/);
  assert.match(prompt, /Do not treat your selected demo map region as my location/);
  assert.doesNotMatch(prompt, /Question for the provider/);
});
