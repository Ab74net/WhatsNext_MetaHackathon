// Public adapter entry point: the real implementation is intentionally never imported.
export { demoApi as api } from "./demo/client";
export type { ExportFormat, ItemPatch } from "./adapters/contracts";

// Run async tasks with at most `limit` in flight.
export async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  });
  await Promise.all(workers);
}
