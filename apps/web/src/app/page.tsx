import { ArrowRight, Check, MessageCircle } from "lucide-react";
import brand from "@shared/brand.json";
import { ButtonLink } from "@/components/ui";
import { HeroBackdrop } from "@/components/home/HeroBackdrop";

const STEPS = [
  { title: "Pick photos you already have",
    body: "Birthdays, holidays, move-in day. Your belongings are in the background of photos on your phone." },
  { title: "We find your things",
    body: "Each item is outlined, matched across photos, and given an estimated price from a real retail listing." },
  { title: "You confirm, then export",
    body: "Nothing goes on the list until you confirm it. Download a PDF and a spreadsheet with a photo beside each item." },
];

const PROMISES = [
  { title: "Your photos stay yours",
    body: "Only the photos you pick are used. Location data is removed, and everything is deleted when you finish." },
  { title: "Honest estimates",
    body: "Every price is an estimate with its source. Nothing is added to your claim without your confirmation." },
  { title: "Official sources first",
    body: "Alerts and aid programs come from official sources, each with the time it was last checked." },
];

export default function Home() {
  return (
    <>
      <section className="relative isolate flex min-h-[min(88svh,760px)] items-end text-white">
        <HeroBackdrop />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-12 pt-32 sm:px-8 sm:pb-16">
          <p className="text-sm text-white/80">Free and private. No account needed.</p>
          <h1 className="max-w-2xl text-[2.6rem] leading-[1.05] sm:text-6xl">{brand.tagline}</h1>
          <p className="max-w-xl text-lg leading-relaxed text-white/85">
            Get a clear plan for today, find official help near you, and rebuild a claim-ready list of what
            you owned from the photos already on your phone.
          </p>
          <div className="mt-1 flex flex-wrap gap-3">
            <ButtonLink href="/agent" variant="primary" size="lg">
              <MessageCircle className="size-[18px]" aria-hidden /> Ask {brand.agentName}
            </ButtonLink>
            <ButtonLink href="/claims" size="lg" className="bg-white/10 text-white hover:bg-white/20">
              Build my claim inventory <ArrowRight className="size-[18px]" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-14 sm:px-8 lg:gap-20 lg:py-20">
        <section className="grid gap-8 md:grid-cols-[1fr_1.6fr] md:gap-12" aria-labelledby="how">
          <div>
            <h2 id="how" className="text-3xl">Rebuild your inventory</h2>
            <p className="mt-3 text-muted">
              Insurers ask for a list of everything you lost. Most people have the evidence already, scattered across years of photos.
            </p>
          </div>
          <ol className="flex flex-col">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3rem_1fr] gap-x-4 border-t border-line py-5 first:border-t-0 first:pt-0 md:first:border-t md:first:pt-5">
                <span className="font-serif text-2xl leading-none text-accent tabular-nums" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-lg">{s.title}</h3>
                  <p className="mt-1 text-[15px] text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <MeetWren />

        <section aria-labelledby="promises">
          <h2 id="promises" className="text-3xl">What we promise</h2>
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
    <section className="grid items-center gap-8 rounded-lg bg-surface p-6 sm:grid-cols-[auto_1fr] sm:p-10" aria-labelledby="wren">
      {/* eslint-disable-next-line @next/next/no-img-element -- small static webp */}
      <img src="/wren/scene-guide.webp" alt={`${brand.agentName}, a friendly first-aid kit, pointing at a screen`}
        width={480} height={351} loading="lazy" className="w-44 sm:w-60" />
      <div>
        <h2 id="wren" className="text-3xl">Meet {brand.agentName}</h2>
        <p className="mt-3 max-w-xl text-muted">
          Tell {brand.agentName} what happened. You get a short plan for today and this week, places on a map,
          and the programs that may apply to you. Every answer links to its official source.
        </p>
        <ButtonLink href="/agent" className="mt-5" variant="primary">
          Start with a question <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}
