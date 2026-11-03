"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Check, Expand, House, Minus, Move, Plus, RotateCcw } from "lucide-react";
import type { InventoryItem, MemoryWeb } from "@shared/types";
import { buildMemoryGraph, connectionPath, fitGraph, HOME_ID, MAX_ZOOM, MIN_ZOOM, zoomGraph, type GraphSelection, type GraphView, type MemoryGraph as Graph, type MemoryNode, type MemoryViewport, type Point } from "@/lib/memoryGraph";
import { MemoryGestures } from "@/lib/memoryGestures";
import { Button, Card } from "@/components/ui";

const INITIAL_VIEW: GraphView = { x: 450, y: 300, k: 1 };
export function MemoryGraph({ web, items, dismissed, added, selected, onSelect, viewportRef }: {
  web: MemoryWeb; items: Record<string, InventoryItem>; dismissed: Set<string>; added: Record<string, string>;
  selected: GraphSelection | null; onSelect: (selection: GraphSelection | null) => void;
  viewportRef: RefObject<MemoryViewport>;
}) {
  const canvas = useRef<SVGSVGElement>(null);
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [] });
  const [size, setSize] = useState({ width: 900, height: 600 });
  const measured = useRef(size);
  const [view, setView] = useState(INITIAL_VIEW);
  const current = useRef(view);
  const fitted = useRef(false);
  const gesture = useRef(new MemoryGestures());
  const [dragging, setDragging] = useState(false);
  const updateView = useCallback((next: GraphView) => {
    current.current = next;
    viewportRef.current.view = next;
    setView(next);
  }, [viewportRef]);

  useEffect(() => {
    // The external layout runs only after React commits. Existing positions are pinned;
    // appearance/price/confirmation updates never restart a live force simulation.
    const frame = requestAnimationFrame(() => {
      const next = buildMemoryGraph(web, items, dismissed, added, viewportRef.current.positions);
      for (const n of next.nodes) viewportRef.current.positions.set(n.id, { x: n.x, y: n.y, width: n.width, height: n.height });
      setGraph(next);
    });
    return () => cancelAnimationFrame(frame);
  }, [web, items, dismissed, added, viewportRef]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const saved = viewportRef.current.view, savedSize = viewportRef.current.size;
    let first = true;
    if (saved) fitted.current = true;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(1, entry.contentRect.width), height = Math.max(1, entry.contentRect.height);
      const old = measured.current;
      if (first && saved) {
        updateView({ ...saved, x: saved.x + (savedSize ? (width - savedSize.width) / 2 : 0), y: saved.y + (savedSize ? (height - savedSize.height) / 2 : 0) });
      } else if (fitted.current && (old.width !== width || old.height !== height)) {
        updateView({ ...current.current, x: current.current.x + (width - old.width) / 2, y: current.current.y + (height - old.height) / 2 });
      }
      first = false;
      measured.current = { width, height };
      viewportRef.current.size = { width, height };
      if (old.width !== width || old.height !== height) setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [updateView, viewportRef]);

  useEffect(() => {
    if (!graph.nodes.length) return;
    const frame = requestAnimationFrame(() => {
      if (fitted.current) return;
      fitted.current = true;
      updateView(fitGraph(graph.nodes, size.width, size.height));
    });
    return () => cancelAnimationFrame(frame);
  }, [graph, size, updateView]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); event.stopPropagation();
      const rect = element.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      updateView(zoomGraph(current.current, { x: event.clientX - rect.left, y: event.clientY - rect.top }, Math.exp(-Math.max(-400, Math.min(400, delta)) * .002)));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [updateView]);

  useEffect(() => {
    const element = canvas.current, tracking = gesture.current;
    const cancel = () => {
      for (const id of tracking.cancel()) if (element?.hasPointerCapture(id)) element.releasePointerCapture(id);
      setDragging(false);
    };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => { tracking.cancel(); window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  function local(event: ReactPointerEvent<SVGSVGElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function pointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gesture.current.down(event.pointerId, local(event), (event.target as Element).closest("[data-node-id]")?.getAttribute("data-node-id") ?? null);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const next = gesture.current.move(event.pointerId, local(event), current.current);
    if (!next) return;
    event.preventDefault(); setDragging(true);
    updateView(next);
  }
  function pointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    gesture.current.up(event.pointerId, event.type !== "pointerup");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(gesture.current.dragging);
  }
  function select(node: MemoryNode) {
    onSelect(selected?.kind === node.kind && selected.id === node.entityId ? null : { kind: node.kind, id: node.entityId });
  }
  function centerNode(node: MemoryNode) {
    updateView({ ...current.current, x: size.width / 2 - node.x * current.current.k, y: size.height / 2 - node.y * current.current.k });
  }
  const selectedNode = graph.nodes.find((n) => n.entityId === selected?.id && n.kind === selected.kind);
  const lookup = new Map(graph.nodes.map((n) => [n.id, n]));

  return <Card className="memory-graph min-w-0 overflow-hidden">
    <div className="memory-toolbar flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-semibold"><House className="size-4 text-blue" aria-hidden />Your belongings</span>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Graph view controls">
        <Button variant="ghost" size="sm" aria-label="Zoom out" disabled={view.k <= MIN_ZOOM} onClick={() => updateView(zoomGraph(current.current, { x: size.width / 2, y: size.height / 2 }, 1 / 1.25))}><Minus className="size-4" aria-hidden /></Button>
        <output aria-label="Graph zoom" className="w-11 text-center text-xs tabular-nums text-muted">{Math.round(view.k * 100)}%</output>
        <Button variant="ghost" size="sm" aria-label="Zoom in" disabled={view.k >= MAX_ZOOM} onClick={() => updateView(zoomGraph(current.current, { x: size.width / 2, y: size.height / 2 }, 1.25))}><Plus className="size-4" aria-hidden /></Button>
        <Button size="sm" variant="ghost" aria-label="Reset view" onClick={() => updateView({ k: 1, x: size.width / 2, y: size.height / 2 })}><RotateCcw className="size-4" aria-hidden /><span className="hidden sm:inline">Reset</span></Button>
        <Button size="sm" aria-label="Fit to view" onClick={() => updateView(fitGraph(graph.nodes, size.width, size.height))}><Expand className="size-4" aria-hidden />Fit</Button>
      </div>
    </div>
    <svg ref={canvas} viewBox={`0 0 ${size.width} ${size.height}`} className={`memory-canvas ${dragging ? "is-dragging" : ""}`} role="group" aria-label={`Memory web: ${web.rooms.length} rooms. Scroll to zoom, drag to pan. Tab to a node and press Enter for details.`}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp}
      onClick={(event) => {
        if (event.detail === 0) return; // Keyboard and assistive activation is handled on the node.
        const id = gesture.current.click();
        const node = graph.nodes.find((node) => node.id === id);
        if (node) select(node);
      }}>
      <g data-graph-transform transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
        {graph.edges.map((edge) => {
          const a = lookup.get(edge.source), b = lookup.get(edge.target);
          if (!a || !b) return null;
          const highlighted = selectedNode?.id === a.id || selectedNode?.id === b.id;
          return <path key={`${edge.source}-${edge.target}`} d={connectionPath(a, b)} fill="none" stroke={highlighted ? "var(--blue)" : "var(--line-strong)"}
            strokeWidth={highlighted ? 2 : 1.3} strokeDasharray={edge.kind === "suggests" ? "5 5" : undefined} opacity={highlighted ? 1 : .65} />;
        })}
        {graph.nodes.map((node) => {
          const on = selectedNode?.id === node.id;
          const suggestion = node.kind === "suggestion", item = node.kind === "item", home = node.id === HOME_ID;
          const fill = home ? "var(--primary)" : item ? "var(--accent)" : on ? "var(--blue-soft)" : "var(--surface)";
          const text = home ? "var(--primary-ink)" : item ? "var(--accent-ink)" : "var(--ink)";
          const label = node.label.length > 29 ? `${node.label.slice(0, 28)}…` : node.label;
          return <g key={node.id} data-node-id={node.id} data-node-kind={node.kind} transform={`translate(${node.x} ${node.y})`}
            className="memory-node" role="button" tabIndex={0} aria-pressed={on}
            aria-label={suggestion ? `Did you own ${node.label}?` : node.label}
            onClick={(event) => { if (event.detail === 0) select(node); }}
            onFocus={(event) => {
              if (!event.currentTarget.matches(":focus-visible")) return;
              const x = node.x * current.current.k + current.current.x, y = node.y * current.current.k + current.current.y;
              if (x < 50 || x > size.width - 50 || y < 40 || y > size.height - 40) centerNode(node);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(node); }
              if (event.key === "Escape") onSelect(null);
            }}>
            <title>{node.label}{suggestion ? " · suggestion, not in your inventory" : item ? " · confirmed in your inventory" : ""}</title>
            {home ? <circle className="memory-node-shape" r={68} fill={fill} stroke={on ? "var(--blue)" : "transparent"} strokeWidth={3} />
              : <rect className="memory-node-shape" x={-node.width / 2} y={-23} width={node.width} height={46} rx={23} fill={fill}
                stroke={on ? "var(--blue)" : item ? "transparent" : "var(--line-strong)"} strokeWidth={on ? 2.5 : 1.3} strokeDasharray={suggestion ? "5 4" : undefined} />}
            {home ? <><House x={-18} y={-31} width={36} height={36} stroke={text} strokeWidth={1.8} /><text textAnchor="middle" y={29} fill={text} fontSize={16} fontWeight={700}>Your home</text></>
              : <><text x={item || suggestion ? -10 : 0} y={5} textAnchor="middle" fill={text} fontSize={14} fontWeight={node.kind === "room" ? 700 : 600} className="capitalize">{label}</text>
                {item && <Check x={node.width / 2 - 32} y={-8} width={16} height={16} stroke={text} strokeWidth={2.8} />}
                {suggestion && <text x={node.width / 2 - 23} y={5} textAnchor="middle" fill="var(--muted)" fontSize={14} fontWeight={600}>?</text>}</>}
          </g>;
        })}
      </g>
    </svg>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full border border-ink" />Room</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full bg-accent" />Confirmed item</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-full border border-dashed border-line-strong" />Suggestion</span>
      </div>
      <span className="flex items-center gap-1.5"><Move className="size-3.5" aria-hidden />Scroll to zoom · drag to move</span>
    </div>
  </Card>;
}
