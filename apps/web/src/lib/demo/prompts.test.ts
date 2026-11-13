import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_RESOURCES, SAMPLE_PROMPTS, matchPrompt, prepareReply, scriptedReply } from "./prompts.ts";
import type { CaseFile } from "@shared/types";

const caseFile: CaseFile = { scenario: "nrv", preset: "during", home_damage: "unknown", insured: "unknown", lost_documents: "unknown" };
test("all ten sample prompts select their intended scripted response", () => {
  for (const prompt of SAMPLE_PROMPTS) assert.equal(matchPrompt(prompt.text), prompt.id, prompt.text);
});
test("emergency terms override other intents and return only the emergency stop", async () => {
  for (const text of ["injured and need a claim", "danger from wildfire", "911", "hurt after flood", "bleeding but need shelter"]) {
    const reply = await prepareReply(text, caseFile);
    assert.deepEqual(reply.ui, [{ type: "emergency" }]);
    assert.match(reply.message, /911/);
  }
});
test("unknown text receives an honest fallback, never invented advice", () => {
  const reply = scriptedReply("tell me about penguins", caseFile);
  assert.deepEqual(reply.ui, []);
  assert.match(reply.message, /sample prompts only/);
});
test("all resource pins are fictional and have no availability claims or directions", () => {
  for (const r of EXAMPLE_RESOURCES) {
    assert.match(r.name, /example/);
    assert.match(r.address, /Fictional/);
    assert.equal(r.hours, null); assert.equal(r.phone, null); assert.equal(r.source_url, "");
  }
});
test("aborting a scripted reply cancels its preparation delay", async () => {
  const controller = new AbortController();
  const pending = prepareReply("shelter", caseFile, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});
