import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { SAMPLE_PROMPTS, scriptedReply } from "./prompts.ts";
import type { CaseFile } from "@shared/types";
const caseFile: CaseFile = { scenario: "nrv", preset: "during", home_damage: "unknown", insured: "unknown", lost_documents: "unknown" };
test("scripted responses and Aid records never promise eligibility, submission or live conditions", () => {
  const catalog = readFileSync(new URL("../../../public/aid-programs.json", import.meta.url), "utf8");
  const content = catalog + JSON.stringify(SAMPLE_PROMPTS.map(p => scriptedReply(p.text, caseFile)));
  assert.doesNotMatch(content, /you (?:are eligible|qualify|are approved)|guaranteed (?:approval|assistance|payment)|we (?:will submit|have submitted|submit your)|your application has been submitted|live now:|active National Weather Service alerts/i);
});
test("every scripted bulletin is frozen and has no live alert payload", () => {
  for (const prompt of SAMPLE_PROMPTS) for (const card of scriptedReply(prompt.text, caseFile).ui) if (card.type === "alerts") {
    assert.deepEqual(card.live, []);
    assert.equal(card.live_source_url, "");
    for (const alert of card.recorded) { assert.equal(alert.recorded, true); assert.match(alert.title, /Sample/); assert.ok(alert.effective); }
  }
});
