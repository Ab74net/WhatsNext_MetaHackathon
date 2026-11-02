import { ArrowRight, Camera, FileSpreadsheet, Lock, MessageCircle, ScanSearch, ShieldCheck } from "lucide-react";
import brand from "@shared/brand.json";
import { ButtonLink, Card } from "@/components/ui";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";

export default function Home() {
  return (
    <>
    <section className="relative isolate flex min-h-[min(88svh,760px)] items-end text-white">
      <HeroBackdrop />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-12 pt-32 sm:pb-16">
        <p className="inline-flex items-center gap-1.5 text-sm text-white/80">
          <ShieldCheck className="size-4" aria-hidden /> Free · private · no account needed
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">{brand.tagline}</h1>
        <p className="max-w-xl text-lg text-white/85">
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
    </section>
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 lg:py-10">
      <MeetWren />

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
    </>
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

// Wren, the assistant, introduced in the hero.
function MeetWren() {
  return (
    <div className="relative hidden flex-col items-center gap-3 md:flex">
      <div className="absolute -inset-6 rounded-3xl bg-[radial-gradient(circle_at_50%_40%,var(--accent-soft),transparent_70%)]" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element -- small static webp */}
      <img src="/wren/wren-hero.webp" alt={`${brand.agentName}, a friendly first-aid kit with a heart, waving`}
        width={320} height={320} className="relative w-72 rounded-3xl shadow-pop" />
      <p className="relative max-w-64 text-center text-sm text-muted">
        Hi, I’m {brand.agentName}. I’ll help you find official help and rebuild your claim.
      </p>
    </div>
  );
}
