import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryGestures } from "./memoryGestures.ts";

const view = { x: 100, y: 50, k: 1 };

test("a delayed browser click activates a pointer tap exactly once", async () => {
  const gesture = new MemoryGestures();
  gesture.down(1, { x: 40, y: 50 }, "item:sofa");
  gesture.up(1);
  await new Promise((resolve) => setTimeout(resolve, 40)); // Beyond the old RAF suppression window.
  assert.equal(gesture.click(), "item:sofa");
  assert.equal(gesture.click(), null);
});

test("dragging a node pans the canvas and never activates that node", () => {
  const gesture = new MemoryGestures();
  gesture.down(1, { x: 10, y: 20 }, "item:sofa");
  assert.equal(gesture.move(1, { x: 12, y: 21 }, view), null);
  const moved = gesture.move(1, { x: 80, y: 55 }, view)!;
  assert.deepEqual(moved, { x: 170, y: 85, k: 1 });
  gesture.up(1);
  assert.equal(gesture.click(), null);
  assert.equal(gesture.move(1, { x: 100, y: 100 }, moved), null);
});

test("cancelled or lost capture releases the gesture and allows the next tap", () => {
  const gesture = new MemoryGestures();
  gesture.down(1, { x: 40, y: 50 }, "item:sofa");
  gesture.up(1, true);
  assert.equal(gesture.click(), null);
  assert.equal(gesture.move(1, { x: 150, y: 180 }, view), null);
  gesture.down(2, { x: 40, y: 50 }, "room:living");
  gesture.up(2);
  gesture.up(2, true); // Browser lostpointercapture after the normal release.
  assert.equal(gesture.click(), "room:living");
});

test("pinch keeps its midpoint anchored, then one remaining finger pans without selecting", () => {
  const gesture = new MemoryGestures();
  gesture.down(1, { x: 100, y: 100 }, "item:sofa");
  gesture.down(2, { x: 200, y: 100 }, null);
  const zoomed = gesture.move(2, { x: 300, y: 100 }, view)!;
  assert.equal(zoomed.k, 2);
  assert.equal((150 - view.x) / view.k, (200 - zoomed.x) / zoomed.k);
  gesture.up(2);
  const panned = gesture.move(1, { x: 120, y: 130 }, zoomed)!;
  assert.equal(panned.x - zoomed.x, 20);
  assert.equal(panned.y - zoomed.y, 30);
  gesture.up(1);
  assert.equal(gesture.click(), null);
});

test("a new drag or blank-canvas tap cannot reuse an old node activation", () => {
  const gesture = new MemoryGestures();
  gesture.down(1, { x: 40, y: 50 }, "item:sofa");
  gesture.up(1);
  gesture.down(2, { x: 40, y: 50 }, null);
  gesture.up(2);
  assert.equal(gesture.click(), null);
});

test("leaving the window clears every finger and any pending activation", () => {
  const gesture = new MemoryGestures();
  gesture.down(1, { x: 100, y: 100 }, "item:sofa");
  gesture.down(2, { x: 200, y: 100 }, null);
  assert.deepEqual(gesture.cancel(), [1, 2]);
  assert.equal(gesture.dragging, false);
  assert.equal(gesture.move(1, { x: 150, y: 100 }, view), null);
  gesture.up(1);
  assert.equal(gesture.click(), null);
});
