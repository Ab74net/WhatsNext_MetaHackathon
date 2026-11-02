import { ArrowRight, Bell, FileText, MapPin, Package, Send } from "lucide-react";
import brand from "@shared/brand.json";
import { ButtonLink, Card } from "@/components/ui";

// Placeholder: the agent (tool calls -> UIInstruction cards and map) is Phase 4.
const SUGGESTIONS = [
  { icon: Bell, text: "What alerts are active near me?" },
  { icon: MapPin, text: "Where can I stay tonight?" },
  { icon: FileText, text: "What aid can I apply for?" },
  { icon: Package, text: "Help me start an insurance claim" },
];

export default function AgentPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <Card className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent font-bold text-accent-ink">
            {brand.agentName[0]}
          </span>
          <div>
            <p className="font-semibold">{brand.agentName}</p>
            <p className="text-xs text-muted">Disaster recovery assistant · arriving soon</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-10 text-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hi, I’m {brand.agentName}.</h1>
            <p className="mt-2 max-w-md text-muted">
              I answer with a plan, a live map and step-by-step cards instead of long text, using official
              sources only. I’m still being set up. You can start your claim inventory now.
            </p>
          </div>
          <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 rounded-xl border border-line px-3.5 py-3 text-left text-sm text-muted">
                <Icon className="size-4 shrink-0 text-accent" aria-hidden /> {text}
              </div>
            ))}
          </div>
          <ButtonLink href="/claims" variant="primary">
            Start my claim inventory <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-full bg-surface-2 py-1.5 pl-4 pr-1.5 opacity-60">
            <input disabled placeholder={`Message ${brand.agentName}`} className="flex-1 bg-transparent text-sm outline-none" />
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink">
              <Send className="size-4" aria-hidden />
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
