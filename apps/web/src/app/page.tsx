import { ArrowRight, Check } from "lucide-react";
import brand from "@shared/brand.json";
import { ButtonLink } from "@/components/ui";
import { HomeHero } from "@/components/home/HomeHero";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata("/");

const STEPS = [
  { title: "Choose supplied sample photos", body: "Try a living room, kitchen, or bedroom set. Your own photos are never accepted." },
  { title: "Explore a simulated scan", body: "Precomputed outlines and detections appear in stages. Every price is a sample estimate with no retail source." },
  { title: "Confirm, then export a sample", body: "Edit the example items and confirm what enters the export. Every PDF and spreadsheet is clearly marked SAMPLE." },
];
const PROMISES = [
  { title: "No real uploads", body: "The demo accepts no photos and runs no AI. Free text stays in your browser." },
  { title: "Honest sample data", body: "Detections, estimates, plans, and fictional map places are examples, not findings about you." },
  { title: "Browser-only progress", body: "No accounts, analytics, or server storage. Reset demo clears the app’s saved browser state." },
];

export default function Home() {
  return (
    <>
      <div className="mx-auto w-full max-w-[1440px] px-5 py-4 sm:px-8"><EmergencyNotice /></div>
      <section className="relative overflow-hidden">
        <HomeHero>
          <div className="home-copy">
            <p className="page-eyebrow mb-3">Concept demo · Sample data only</p>
            <h1>{brand.tagline}</h1>
            <p className="home-subtitle">
              Explore a clearer next step.
            </p>
            <p className="mt-5 max-w-lg text-base text-muted sm:text-lg">A simulated disaster recovery workflow, from example photos to a reviewed sample inventory.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/agent" variant="primary" size="lg">
                Try scripted {brand.agentName} <ArrowRight className="size-[18px]" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/claims" variant="secondary" size="lg">Try a sample claim</ButtonLink>
            </div>
            <p className="mt-4 text-xs text-subtle">No account, uploads, or live AI. Everything here is an example.</p>
          </div>
        </HomeHero>
      </section>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-14 sm:px-8 lg:gap-20 lg:py-20">
        <section className="grid gap-8 md:grid-cols-[1fr_1.6fr] md:gap-12" aria-labelledby="how">
          <div>
            <h2 id="how" className="text-3xl">Rebuild your inventory</h2>
            <p className="mt-3 text-muted">
              The original idea helps people rebuild an inventory from everyday photos. This public concept demonstrates that process with supplied samples.
            </p>
          </div>
          <ol className="flex flex-col">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3rem_1fr] gap-x-4 border-t border-line py-5 first:border-t-0 first:pt-0 md:first:border-t md:first:pt-5">
                <span className="font-display text-2xl font-bold leading-none text-accent tabular-nums" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg">{s.title}</h3>
                  <p className="mt-1 text-[15px] text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <MeetWren />

        <section className="grid items-center gap-6 rounded-3xl border border-line bg-blue-soft p-6 sm:grid-cols-[1fr_auto] sm:p-9" aria-labelledby="aid-intro">
          <div className="min-w-0 flex-1"><h2 id="aid-intro" className="text-3xl">Find a starting point for support.</h2><p className="mt-3 max-w-xl text-muted">Aid Autopilot demonstrates example program matching, document checklists, and local preparation drafts. It does not verify current programs or determine eligibility.</p></div>
          <ButtonLink href="/aid" variant="primary">Explore Aid Autopilot<ArrowRight className="size-4" aria-hidden /></ButtonLink>
        </section>

        <section id="privacy" className="scroll-mt-28" aria-labelledby="promises">
          <h2 id="promises" className="text-3xl">What this demo does</h2>
          <ul className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {PROMISES.map((p) => (
              <li key={p.title} className="border-t border-line pt-5">
                <p className="flex items-center gap-2 font-semibold">
                  <Check className="size-4 shrink-0 text-good" aria-hidden /> {p.title}
                </p>
                <p className="mt-2 text-[15px] text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <ButtonLink href="/privacy">Read the demo privacy details</ButtonLink>
        <p className="border-t border-line pt-6 text-sm text-subtle">
          General guidance only. Not insurance or legal advice, and not local emergency instructions.
          If you are in danger, call 911.
        </p>
      </div>
    </>
  );
}

// Wren, the assistant, introduced below the steps.
function MeetWren() {
  return (
    <section className="grid items-center gap-8 rounded-3xl border border-line bg-surface p-6 sm:grid-cols-[auto_1fr] sm:p-10" aria-labelledby="wren">
      {/* eslint-disable-next-line @next/next/no-img-element -- small static webp */}
      <img src="/wren/scene-guide.webp" alt={`${brand.agentName}, a friendly first-aid kit, pointing at a screen`}
        width={480} height={351} loading="lazy" className="w-44 sm:w-60" />
      <div>
        <h2 id="wren" className="text-3xl">Meet {brand.agentName}</h2>
        <p className="mt-3 max-w-xl text-muted">
          Choose a sample prompt for {brand.agentName}. Hand-written responses show example plans and a schematic map of fictional places. Dated safety guidance links to official sources. No conditions are checked live.
        </p>
        <ButtonLink href="/agent" className="mt-5" variant="primary">
          Try the sample prompts <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}
