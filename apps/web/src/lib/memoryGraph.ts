import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import type { SimulationNodeDatum } from "d3-force";
import type { InventoryItem, MemoryWeb } from "@shared/types";

export type NodeKind = "hub" | "room" | "item" | "suggestion";
export interface GraphSelection { kind: NodeKind; id: string }
export interface Point { x: number; y: number }
export interface NodePosition extends Point { width: number; height: number }
export interface MemoryNode extends SimulationNodeDatum {
  x: number; y: number; width: number; height: number;
  id: string; entityId: string; kind: NodeKind; label: string; roomId?: string;
}
export interface MemoryEdge { source: string; target: string; kind: "home" | "owns" | "suggests" }
export interface MemoryGraph { nodes: MemoryNode[]; edges: MemoryEdge[] }
export interface GraphView extends Point { k: number }
export const MIN_ZOOM = 0.12;
export const MAX_ZOOM = 3;
export const HOME_ID = "__home";

export function nodeWidth(label: string, kind: NodeKind) {
  if (kind === "hub") return 136;
  return Math.max(116, Math.min(280, label.length * 7.2 + (kind === "room" ? 48 : 54)));
}
export function overlap(a: NodePosition, b: NodePosition, gap = 16) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + gap;
}
function vacant(node: MemoryNode, placed: MemoryNode[]): Point {
  if (!placed.some((p) => overlap(node, p))) return node;
  // Resolve rectangular labels after the force simulation. No canvas-edge clamping: the
  // world can grow, and the viewport frames it. This avoids packing labels onto a border.
  for (let ring = 1; ring < 500; ring++) {
    const count = Math.max(12, ring * 8);
    for (let i = 0; i < count; i++) {
      const angle = i * 2 * Math.PI / count;
      const point = { x: node.x + Math.cos(angle) * ring * 28, y: node.y + Math.sin(angle) * ring * 28 };
      if (!placed.some((p) => overlap({ ...node, ...point }, p))) return point;
    }
  }
  return { x: Math.max(0, ...placed.map((p) => p.x + p.width / 2)) + node.width, y: node.y };
}

export function buildMemoryGraph(web: MemoryWeb, items: Record<string, InventoryItem>, dismissed: Set<string>, added: Record<string, string>, previous = new Map<string, NodePosition>()): MemoryGraph {
  const nodes = new Map<string, MemoryNode>();
  const edges: MemoryEdge[] = [];
  const add = (id: string, entityId: string, kind: NodeKind, label: string, roomId?: string) => {
    if (!nodes.has(id)) nodes.set(id, { id, entityId, kind, label, roomId, width: nodeWidth(label, kind), height: kind === "hub" ? 136 : 46, x: 0, y: 0 });
  };
  add(HOME_ID, HOME_ID, "hub", "Your home");
  for (const room of web.rooms) {
    const rid = `room:${room.id}`;
    add(rid, room.id, "room", room.name);
    edges.push({ source: HOME_ID, target: rid, kind: "home" });
    for (const id of room.item_ids) {
      if (!items[id]?.user_confirmed || nodes.has(`item:${id}`)) continue;
      add(`item:${id}`, id, "item", items[id].category, room.id);
      edges.push({ source: rid, target: `item:${id}`, kind: "owns" });
    }
  }
  for (const s of web.suggestions) {
    if (dismissed.has(s.id) || !nodes.has(`room:${s.room_id}`)) continue;
    const item = added[s.id] ? items[added[s.id]] : undefined;
    if (item?.user_confirmed) {
      const id = `item:${item.id}`;
      if (!nodes.has(id)) {
        add(id, item.id, "item", item.category, s.room_id);
        edges.push({ source: `room:${s.room_id}`, target: id, kind: "owns" });
      }
    } else {
      const id = `suggestion:${s.id}`;
      add(id, s.id, "suggestion", s.name, s.room_id);
      const anchors = [...new Set(s.related_item_ids)].map((a) => `item:${a}`).filter((a) => nodes.has(a));
      for (const anchor of anchors.length ? anchors : [`room:${s.room_id}`]) edges.push({ source: anchor, target: id, kind: "suggests" });
    }
  }
  const list = [...nodes.values()];
  const cached = new Map(previous);
  // A confirmed suggestion occupies the same place where its dashed prompt was.
  for (const [suggestionId, itemId] of Object.entries(added)) {
    const point = cached.get(`suggestion:${suggestionId}`);
    if (point && !cached.has(`item:${itemId}`)) cached.set(`item:${itemId}`, point);
  }
  const fixed = new Set<string>();
  const rooms = list.filter((n) => n.kind === "room");
  rooms.forEach((room, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / Math.max(1, rooms.length);
    room.x = Math.cos(angle) * 260; room.y = Math.sin(angle) * 260;
  });
  for (const n of list) {
    const old = cached.get(n.id);
    if (old) {
      n.x = old.x; n.y = old.y;
      if (old.width === n.width && old.height === n.height) { n.fx = n.x; n.fy = n.y; fixed.add(n.id); }
    } else if (n.roomId) {
      const room = nodes.get(`room:${n.roomId}`);
      const i = list.indexOf(n), angle = i * 2.399963;
      n.x = (room?.x ?? 0) + Math.cos(angle) * 160;
      n.y = (room?.y ?? 0) + Math.sin(angle) * 140;
    }
  }
  const hub = nodes.get(HOME_ID)!;
  hub.fx = 0; hub.fy = 0; hub.x = 0; hub.y = 0; fixed.add(HOME_ID);
  const sim = forceSimulation(list)
    .force("link", forceLink<MemoryNode, { source: string | MemoryNode; target: string | MemoryNode }>(edges.map((e) => ({ source: e.source, target: e.target }))).id((n) => n.id).distance(170).strength(.35))
    .force("charge", forceManyBody().strength(-450))
    .force("x", forceX<MemoryNode>(0).strength(.035))
    .force("y", forceY<MemoryNode>(0).strength(.035))
    .force("collision", forceCollide<MemoryNode>((n) => Math.hypot(n.width / 2, n.height / 2) + 12))
    .stop();
  for (let i = 0; i < 200; i++) sim.tick();
  const placed = list.filter((n) => fixed.has(n.id));
  for (const n of list.filter((n) => !fixed.has(n.id))) {
    // New confirmations can reuse a former suggestion position without moving neighbors.
    const old = cached.get(n.id);
    if (old) { n.x = old.x; n.y = old.y; }
    const point = vacant(n, placed); n.x = point.x; n.y = point.y; placed.push(n);
  }
  return { nodes: list, edges };
}

export function graphBounds(nodes: NodePosition[]) {
  if (!nodes.length) return { left: -100, top: -100, right: 100, bottom: 100 };
  return { left: Math.min(...nodes.map((n) => n.x - n.width / 2)), top: Math.min(...nodes.map((n) => n.y - n.height / 2)), right: Math.max(...nodes.map((n) => n.x + n.width / 2)), bottom: Math.max(...nodes.map((n) => n.y + n.height / 2)) };
}
export function fitGraph(nodes: NodePosition[], width: number, height: number, padding = 44): GraphView {
  const b = graphBounds(nodes);
  const k = Math.max(MIN_ZOOM, Math.min(1.15, (width - padding * 2) / Math.max(1, b.right - b.left), (height - padding * 2) / Math.max(1, b.bottom - b.top)));
  return { k, x: width / 2 - (b.left + b.right) * k / 2, y: height / 2 - (b.top + b.bottom) * k / 2 };
}
export function zoomGraph(view: GraphView, at: Point, factor: number): GraphView {
  const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.k * factor));
  const ratio = k / view.k;
  return { k, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio };
}
export function connectionPath(a: MemoryNode, b: MemoryNode) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const edge = (n: MemoryNode, toward: number) => {
    const scale = n.kind === "hub" ? (n.width / 2) / Math.max(1, Math.hypot(dx, dy)) : 1 / Math.max(Math.abs(dx) / (n.width / 2), Math.abs(dy) / (n.height / 2), .001);
    return { x: n.x + dx * scale * toward, y: n.y + dy * scale * toward };
  };
  const start = edge(a, 1), end = edge(b, -1), mx = (start.x + end.x) / 2;
  return `M${start.x},${start.y} C${mx},${start.y} ${mx},${end.y} ${end.x},${end.y}`;
}
