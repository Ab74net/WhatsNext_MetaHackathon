import { ArrowRight, Camera, CircleCheck, FileSpreadsheet, Lock, MessageCircle, ScanSearch, ShieldCheck } from "lucide-react";
import brand from "@shared/brand.json";
import { ButtonLink, Card } from "@/components/ui";

// Static hero for now; the cinematic crossfade hero is Phase 6.
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 lg:py-10">
      <Card className="overflow-hidden">
        <div className="grid items-center gap-8 p-6 sm:p-10 md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
              <ShieldCheck className="size-3.5" aria-hidden /> Free · private · no account needed
            </span>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{brand.tagline}</h1>
            <p className="text-lg text-muted">
              Get a clear plan for today, find official help near you, and rebuild a claim-ready list of what
              you owned from the photos already on your phone.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <ButtonLink href="/agent" variant="primary" size="lg">
                <MessageCircle className="size-[18px]" aria-hidden /> Ask {brand.agentName}
              </ButtonLink>
              <ButtonLink href="/claims" size="lg">
                Build my claim inventory <ArrowRight className="size-[18px]" aria-hidden />
              </ButtonLink>
            </div>
          </div>
          <InventoryPreview />
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-3">
        <Step icon={<Camera className="size-5" />} n={1} title="Pick photos"
          body="Birthdays, holidays, move-in day. Your belongings are in the background of photos you already have." />
        <Step icon={<ScanSearch className="size-5" />} n={2} title="We find your things"
          body="Each item is outlined, matched across photos, and priced from a real retail listing." />
        <Step icon={<FileSpreadsheet className="size-5" />} n={3} title="Export your claim"
          body="You confirm every line. Download a PDF and spreadsheet with a photo beside each item." />
      </section>

      <Card className="grid gap-5 p-6 sm:grid-cols-3">
        <Pledge title="Your photos stay yours" body="Only the photos you pick are used. Location data is removed, and everything is deleted when you finish." />
        <Pledge title="Honest by design" body="Every price is an estimate with its source. Nothing is added to your claim without your confirmation." />
        <Pledge title="Official sources first" body="Alerts and aid programs come from official sources, each with the time it was last checked." />
      </Card>
    </div>
  );
}

function Step({ icon, n, title, body }: { icon: React.ReactNode; n: number; title: string; body: string }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">{icon}</span>
        <span className="text-xs font-semibold text-subtle">STEP {n}</span>
      </div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted">{body}</p>
    </Card>
  );
}

function Pledge({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <Lock className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}

// A stylized, static preview of the inventory screen (no real data).
function InventoryPreview() {
  const rows = [
    { name: "Sofa", meta: "Seen in 3 photos · since 2023", price: "$650 – $900", color: "#0866ff" },
    { name: "Television · Samsung", meta: "Seen in 5 photos · since 2022", price: "$480 – $560", color: "#e9a23b" },
    { name: "Floor lamp", meta: "Seen in 2 photos · since 2024", price: "$60 – $95", color: "#1a8a3c" },
  ];
  return (
    <div aria-hidden className="relative hidden md:block">
      <div className="absolute -inset-6 rounded-3xl bg-[radial-gradient(circle_at_30%_20%,var(--accent-soft),transparent_70%)]" />
      <div className="relative flex flex-col gap-2 rounded-2xl bg-canvas p-3 shadow-pop">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-sm font-semibold">Your inventory</span>
          <span className="rounded-md bg-good-soft px-1.5 py-0.5 text-xs font-semibold text-good">3 confirmed</span>
        </div>
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 rounded-xl bg-surface p-2.5 shadow-card">
            <div className="flex size-11 items-center justify-center rounded-lg bg-surface-2">
              <div className="size-6 rounded-md border-2" style={{ borderColor: r.color, background: `${r.color}22` }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="truncate text-xs text-muted">{r.meta}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{r.price}</p>
              <p className="flex items-center justify-end gap-1 text-xs text-good">
                <CircleCheck className="size-3" /> Confirmed
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
