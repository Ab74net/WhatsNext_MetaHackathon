// Run: npm run test:web (node --test, no extra dependencies).
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildFollowUpEmail, EMPTY_NOTES, EMPTY_PREP, fillTemplate } from "./insurerCall.ts";

test("fills placeholders", () => {
  assert.equal(fillTemplate("Hi {{rep_name}}.", { rep_name: "Dana" }), "Hi Dana.");
});

test("drops a labelled line when its value is empty", () => {
  assert.equal(fillTemplate("A\nPolicy number: {{policy_number}}\nB", { policy_number: " " }), "A\nB");
});

test("marks other missing values for the user to fill in", () => {
  assert.equal(fillTemplate("Thanks,\n{{my_name}}", {}), "Thanks,\n[my name]");
  assert.equal(fillTemplate("On {{call_date}} we spoke.", {}), "On [call date] we spoke.");
});

test("never leaves a raw placeholder", () => {
  const { subject, body } = buildFollowUpEmail(EMPTY_PREP, EMPTY_NOTES);
  assert.doesNotMatch(subject + body, /\{\{|\}\}/);
  assert.doesNotMatch(body, /Policy number:/); // empty labelled lines are dropped
});

test("builds a full summary from local notes", () => {
  const { subject, body } = buildFollowUpEmail(
    { ...EMPTY_PREP, myName: "Sam Lee", policyNumber: "HO-778", dateOfLoss: "2026-08-02" },
    { ...EMPTY_NOTES, repName: "Dana", reference: "CLM-42", callAt: "2026-11-02T14:05", promised: "An adjuster will call.",
      steps: [{ id: "1", text: "Send inventory", due: "2026-11-20" }, { id: "2", text: " ", due: "" }] },
  );
  assert.equal(subject, "Summary of my call on November 2, 2026 at 2:05 PM (claim CLM-42)");
  assert.match(body, /^Hello Dana,/);
  assert.match(body, /Policy number: HO-778/);
  assert.match(body, /Date of loss: August 2, 2026/);
  assert.match(body, /- Send inventory \(by November 20, 2026\)/);
  assert.doesNotMatch(body, /- \s*$/m); // blank steps are skipped
  assert.match(body, /Sam Lee$/m);
});

test("subject without a reference number has no empty claim part", () => {
  const { subject } = buildFollowUpEmail(EMPTY_PREP, { ...EMPTY_NOTES, callAt: "2026-11-02T09:00" });
  assert.equal(subject, "Summary of my call on November 2, 2026 at 9:00 AM");
});
