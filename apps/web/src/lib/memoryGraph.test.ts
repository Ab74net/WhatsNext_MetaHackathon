import assert from "node:assert/strict";
import { test } from "node:test";
import type { InventoryItem, MemoryWeb } from "@shared/types";
import { buildMemoryGraph, fitGraph, MAX_ZOOM, MIN_ZOOM, overlap, relatedSuggestions, zoomGraph } from "./memoryGraph.ts";

function item(id: string, category = `Belonging ${id}`): InventoryItem {
  return { id, category, brand: null, model: null, condition: "good", confidence: .9, evidence: "seen_in_photo", photos: [], estimated_replacement_usd: null, user_confirmed: true };
}
const items = Object.fromEntries(Array.from({ length: 18 }, (_, i) => [String(i), item(String(i))]));
const web: MemoryWeb = {
  rooms: [{ id: "living", name: "Living room", item_ids: Object.keys(items) }],
  suggestions: Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, name: `Suggested belonging ${i}`, room_id: "living", related_item_ids: [String(i), String((i + 1) % 18)], reason: "Related item", proof_hint: "Add a photo" })),
  grades: {},
};
const initial = buildMemoryGraph(web, items, new Set(), {});
const cache = () => new Map(initial.nodes.map((n) => [n.id, { x: n.x, y: n.y, width: n.width, height: n.height }]));

test("crowded rooms have finite, distinct, non-overlapping labels without edge clamping", () => {
  assert.equal(new Set(initial.nodes.map((n) => n.id)).size, initial.nodes.length);
  assert.equal(initial.nodes.length, 32);
  for (const [i, a] of initial.nodes.entries()) {
    assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y));
    for (const b of initial.nodes.slice(i + 1)) assert.equal(overlap(a, b, 8), false, `${a.id} overlaps ${b.id}`);
  }
});
test("editing metadata and dismissing a suggestion do not move surviving nodes", () => {
  const graph = buildMemoryGraph(web, { ...items, "0": { ...items["0"], condition: "worn" } }, new Set(["s0"]), {}, cache());
  for (const node of graph.nodes) { const old = cache().get(node.id)!; assert.equal(node.x, old.x); assert.equal(node.y, old.y); }
  assert.equal(graph.nodes.some((n) => n.id === "suggestion:s0"), false);
});
test("confirmed evidence replaces a prompt in place and does not duplicate an inventory node on refresh", () => {
  const added = item("new", web.suggestions[0].name);
  const refreshed: MemoryWeb = { ...web, rooms: [{ ...web.rooms[0], item_ids: [...web.rooms[0].item_ids, added.id] }] };
  const graph = buildMemoryGraph(refreshed, { ...items, new: added }, new Set(), { s0: "new" }, cache());
  assert.equal(graph.nodes.filter((n) => n.id === "item:new").length, 1);
  assert.equal(graph.nodes.some((n) => n.id === "suggestion:s0"), false);
  assert.equal(graph.nodes.find((n) => n.id === "item:new")!.x, cache().get("suggestion:s0")!.x);
  assert.equal(graph.nodes.find((n) => n.id === "item:new")!.y, cache().get("suggestion:s0")!.y);
  for (const node of graph.nodes.filter((n) => cache().has(n.id))) assert.equal(node.x, cache().get(node.id)!.x);
});
test("unconfirmed or failed confirmations never become solid inventory nodes", () => {
  const graph = buildMemoryGraph(web, { ...items, new: { ...item("new"), user_confirmed: false } }, new Set(), { s0: "new" }, cache());
  assert.ok(graph.nodes.some((n) => n.id === "suggestion:s0"));
  assert.equal(graph.nodes.some((n) => n.id === "item:new"), false);
});
test("item and room clicks offer only their active related prompts", () => {
  const dismissed = new Set(["s1"]);
  const added = { s2: "new" };
  const confirmed = { ...items, new: item("new") };
  assert.deepEqual(relatedSuggestions(web, { kind: "item", id: "0" }, dismissed, added, confirmed).map((s) => s.id), ["s0"]);
  assert.deepEqual(relatedSuggestions(web, { kind: "room", id: "living" }, dismissed, added, confirmed).map((s) => s.id), web.suggestions.map((s) => s.id).filter((id) => id !== "s1" && id !== "s2"));
  assert.deepEqual(relatedSuggestions(web, { kind: "hub", id: "__home" }, dismissed, added, confirmed), []);
});
test("zoom preserves the world point under the cursor and clamps scale", () => {
  const before = { x: 120, y: -70, k: .8 }, point = { x: 350, y: 240 };
  const after = zoomGraph(before, point, 1.7);
  assert.ok(Math.abs((point.x - before.x) / before.k - (point.x - after.x) / after.k) < 1e-9);
  assert.ok(Math.abs((point.y - before.y) / before.k - (point.y - after.y) / after.k) < 1e-9);
  assert.equal(zoomGraph(before, point, 100).k, MAX_ZOOM);
  assert.equal(zoomGraph(before, point, .00001).k, MIN_ZOOM);
});
test("fit frames a dense graph at desktop and phone widths", () => {
  for (const width of [390, 900]) {
    const view = fitGraph(initial.nodes, width, 560);
    for (const n of initial.nodes) {
      assert.ok((n.x - n.width / 2) * view.k + view.x >= 0);
      assert.ok((n.x + n.width / 2) * view.k + view.x <= width + .001);
      assert.ok((n.y - n.height / 2) * view.k + view.y >= 0);
      assert.ok((n.y + n.height / 2) * view.k + view.y <= 560 + .001);
    }
  }
});
