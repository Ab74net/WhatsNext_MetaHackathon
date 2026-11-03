import { zoomGraph, type GraphView, type Point } from "./memoryGraph.ts";

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Keep pointer tracking separate from React rendering. A browser click can arrive after
// pointerup (especially on touch): consume it once, with no animation-frame timing window.
export class MemoryGestures {
  private pointers = new Map<number, Point>();
  private origin: Point | null = null;
  private candidate: string | null = null;
  private activation: string | null = null;
  dragging = false;

  down(id: number, point: Point, nodeId: string | null) {
    if (!this.pointers.size) {
      this.origin = point;
      this.candidate = nodeId;
      this.activation = null;
      this.dragging = false;
    } else this.dragging = true;
    this.pointers.set(id, point);
  }

  move(id: number, point: Point, view: GraphView): GraphView | null {
    if (!this.pointers.has(id)) return null;
    const before = [...this.pointers.values()];
    const wasDragging = this.dragging;
    this.pointers.set(id, point);
    const after = [...this.pointers.values()];
    if (this.origin && distance(this.origin, point) > 4) this.dragging = true;
    if (!this.dragging) return null;
    if (before.length >= 2) {
      const oldCenter = midpoint(before[0], before[1]), center = midpoint(after[0], after[1]);
      const next = zoomGraph(view, oldCenter, distance(after[0], after[1]) / Math.max(1, distance(before[0], before[1])));
      return { ...next, x: next.x + center.x - oldCenter.x, y: next.y + center.y - oldCenter.y };
    }
    const previous = wasDragging ? before[0] : this.origin!;
    return { ...view, x: view.x + point.x - previous.x, y: view.y + point.y - previous.y };
  }

  up(id: number, cancelled = false) {
    if (!this.pointers.delete(id)) return;
    if (cancelled) { this.candidate = null; this.dragging = true; }
    if (!this.pointers.size) {
      this.activation = this.dragging ? null : this.candidate;
      this.origin = null;
      this.candidate = null;
      this.dragging = false;
    }
  }

  click(): string | null {
    const id = this.activation;
    this.activation = null;
    return id;
  }

  cancel(): number[] {
    const ids = [...this.pointers.keys()];
    this.pointers.clear();
    this.origin = null;
    this.candidate = null;
    this.activation = null;
    this.dragging = false;
    return ids;
  }
}
