import Link from "next/link";
import brand from "@shared/brand.json";

// Static hero for now; the cinematic crossfade hero is Phase 6.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent-soft),transparent_65%)]" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{brand.tagline}</h1>
          <p className="max-w-xl text-lg text-muted">
            One calm next step at a time: what to do today, where to get help, and a claim-ready list
            of what you owned, rebuilt from the photos you already have.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/agent" className="rounded-full bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90">
              Start here
            </Link>
            <Link href="/claims" className="rounded-full border border-line bg-surface px-6 py-3 font-medium hover:bg-surface-2">
              Rebuild my inventory
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-10 sm:grid-cols-2">
        <PathCard href="/agent" title={`Ask ${brand.agentName}`} step="1"
          body="Official alerts, nearby shelters and aid programs on a real map, and a plan with your deadlines." />
        <PathCard href="/claims" title="Build your claim inventory" step="2"
          body="Pick photos from your camera roll. We find your belongings and you confirm each one before anything is exported." />
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-12">
        <ul className="grid gap-3 text-sm text-muted sm:grid-cols-3">
          <Pledge title="Your photos stay yours">Only photos you pick are used, and they are deleted when you finish.</Pledge>
          <Pledge title="Honest estimates">Values are estimates with sources. Nothing is added without your confirmation.</Pledge>
          <Pledge title="Official sources">Every alert and program links to its source, with the time it was last checked.</Pledge>
        </ul>
      </section>
    </main>
  );
}

function PathCard({ href, title, body, step }: { href: string; title: string; body: string; step: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line bg-surface p-6 transition-shadow hover:shadow-lg">
      <span className="text-xs font-medium uppercase tracking-widest text-accent">Step {step}</span>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
      <span className="mt-4 inline-block text-sm font-medium text-accent group-hover:translate-x-1 transition-transform">
        Continue →
      </span>
    </Link>
  );
}

function Pledge({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl bg-surface-2 p-4">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1">{children}</p>
    </li>
  );
}
