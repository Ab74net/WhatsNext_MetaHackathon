import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { redact, replacementOrder, waitingOn, type OrderEntry } from "./documentOrder.ts";

const e = (id: string, phase: OrderEntry["phase"], prerequisites: string[] = []): OrderEntry => ({ id, phase, prerequisites });

test("prerequisites come first even across phases", () => {
  const entries = [e("passport", "later", ["birth"]), e("birth", "later", ["license"]), e("license", "week"), e("cards", "48h")];
  assert.deepEqual(replacementOrder(entries, ["passport", "birth", "license", "cards"]).order, ["cards", "license", "birth", "passport"]);
});

test("a later-phase prerequisite pulls ahead of an independent same-phase item only when needed", () => {
  const entries = [e("title", "later"), e("passport", "later", ["birth"]), e("birth", "later"), e("meds", "48h")];
  // phase first, then file order, among items that are ready
  assert.deepEqual(replacementOrder(entries, ["title", "passport", "birth", "meds"]).order, ["meds", "title", "birth", "passport"]);
});

test("documents the user still has never block anything", () => {
  const entries = [e("license", "week"), e("birth", "later", ["license"])];
  assert.deepEqual(replacementOrder(entries, ["birth"]).order, ["birth"]);
});

test("detects a cycle and still returns every lost document", () => {
  const entries = [e("a", "week", ["b"]), e("b", "week", ["a"]), e("c", "48h")];
  const r = replacementOrder(entries, ["a", "b", "c"]);
  assert.deepEqual(r.cycle, ["a", "b"]);
  assert.deepEqual(r.order, ["c", "a", "b"]);
});

test("waitingOn lists unfinished lost prerequisites", () => {
  const birth = e("birth", "later", ["license", "passport"]);
  assert.deepEqual(waitingOn(birth, new Set(["license", "birth"]), new Set()), ["license"]);
  assert.deepEqual(waitingOn(birth, new Set(["license", "birth"]), new Set(["license"])), []);
});

test("the Virginia data file orders cleanly", () => {
  const data = JSON.parse(readFileSync(new URL("../../../../content/documents/virginia.json", import.meta.url), "utf8"));
  const ids: string[] = data.documents.map((d: OrderEntry) => d.id);
  const r = replacementOrder(data.documents, ids);
  assert.deepEqual(r.cycle, []);
  assert.equal(r.order.length, ids.length);
  assert.ok(r.order.indexOf("license_id") < r.order.indexOf("birth_certificate"));
  assert.ok(r.order.indexOf("birth_certificate") < r.order.indexOf("passport"));
});

test("redact strips long numbers and emails, keeps form names", () => {
  assert.equal(redact("policy 4455 667 or a@b.co, form DS-11"), "policy [removed] or [removed] form DS-11");
});
