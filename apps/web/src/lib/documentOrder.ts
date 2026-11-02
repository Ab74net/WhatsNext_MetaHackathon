// Replacement order for the documents a user lost: a topological sort over prerequisites,
// with the phase (48h, week, later) as the tiebreaker. Only lost documents can block each
// other: if you still have your license, nothing waits for it. No aliases, so node --test loads it.

export interface OrderEntry {
  id: string;
  phase: "48h" | "week" | "later";
  prerequisites: string[];
}

const PHASE_RANK = { "48h": 0, week: 1, later: 2 } as const;

export interface OrderResult {
  order: string[];
  /** ids in a prerequisite cycle (empty when the data is sound). They are appended in phase order. */
  cycle: string[];
}

export function replacementOrder(entries: OrderEntry[], lost: Iterable<string>): OrderResult {
  const lostSet = new Set(lost);
  const nodes = entries.filter((e) => lostSet.has(e.id));
  const index = new Map(nodes.map((e, i) => [e.id, i]));
  const blockers = new Map(nodes.map((e) => [e.id, e.prerequisites.filter((p) => index.has(p) && p !== e.id)]));
  const remaining = new Map(nodes.map((e) => [e.id, blockers.get(e.id)!.length]));
  const rank = (e: OrderEntry) => PHASE_RANK[e.phase] * 1000 + index.get(e.id)!;

  const order: string[] = [];
  const ready = nodes.filter((e) => remaining.get(e.id) === 0);
  while (ready.length) {
    ready.sort((a, b) => rank(a) - rank(b));
    const next = ready.shift()!;
    order.push(next.id);
    for (const e of nodes) {
      if (blockers.get(e.id)!.includes(next.id)) {
        remaining.set(e.id, remaining.get(e.id)! - 1);
        if (remaining.get(e.id) === 0) ready.push(e);
      }
    }
  }
  const cycle = nodes.filter((e) => !order.includes(e.id)).sort((a, b) => rank(a) - rank(b)).map((e) => e.id);
  return { order: [...order, ...cycle], cycle };
}

/** Lost prerequisites of `id` that aren't checked off yet: while any remain, the step is locked. */
export function waitingOn(entry: OrderEntry, lost: Set<string>, done: Set<string>): string[] {
  return entry.prerequisites.filter((p) => lost.has(p) && !done.has(p));
}

/** Strip things that look personal (long numbers, email addresses) before a question leaves the device. */
export function redact(text: string): string {
  return text.replace(/\S+@\S+/g, "[removed]").replace(/\d[\d\s-]{3,}\d/g, "[removed]");
}
