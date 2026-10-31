import Link from "next/link";
import brand from "@shared/brand.json";

// Placeholder: the agent (tool calls -> UIInstruction cards and map) is Phase 4.
const SUGGESTIONS = [
  "What alerts are active near me?",
  "Where can I stay tonight?",
  "What aid programs can I apply for?",
  "Help me start an insurance claim",
];

export default function AgentPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-2xl text-accent">
          {brand.agentName[0]}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Hi, I’m {brand.agentName}.</h1>
          <p className="mt-2 max-w-md text-muted">
            I’ll answer with a plan, a map and step-by-step cards instead of long text. I’m arriving
            soon. For now, you can start your inventory.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <span key={s} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted">
              {s}
            </span>
          ))}
        </div>
        <Link href="/claims" className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-ink">
          Start my inventory
        </Link>
      </div>
      <form className="mt-8 flex gap-2 rounded-full border border-line bg-surface p-1.5 opacity-60">
        <input disabled placeholder={`Message ${brand.agentName} (coming soon)`}
          className="flex-1 bg-transparent px-4 text-sm outline-none" />
        <button disabled className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink">Send</button>
      </form>
    </main>
  );
}
