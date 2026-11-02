"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Banknote, Bookmark, Check, CircleAlert, House, LifeBuoy, MapPin, MessageCircle, Network, Package, Pencil, RotateCcw, Search, ShieldCheck, UserRound } from "lucide-react";
import brand from "@shared/brand.json";
import { api } from "@/lib/api";
import { readSavedAgentCase } from "@/lib/useAgent";
import { buildAidRequest, CATEGORY_LABELS, demoAidAdapter, EMPTY_PREPARATION, EMPTY_SITUATION, NEED_LABELS, type AidCategory, type AidPreparation, type AidProgram, type AidSituation } from "@/lib/aidAutopilot";
import { Button, Card, EmptyState, Notice, Skeleton } from "@/components/ui";
import { useAidAutopilot } from "./AidProvider";
import { SituationForm } from "./SituationForm";
import { ResourceCard } from "./ResourceCard";

const CATEGORIES = [
  { id: "financial" as const, icon: Banknote, body: "Explore help with disaster-related costs and getting back on your feet." },
  { id: "housing" as const, icon: House, body: "Find a starting point for shelter and temporary housing support." },
  { id: "essentials" as const, icon: Package, body: "Look for help with food, medicine, and the things you need each day." },
];
type SearchState = { status: "idle" | "loading" } | { status: "done"; programs: AidProgram[] } | { status: "error"; message: string };

export function AidAutopilot() {
  const router = useRouter();
  const aid = useAidAutopilot();
  const { situation, setSituation, preparations, setPreparations, hasSearched, setHasSearched, setAgentDraft } = aid;
  const [view, setView] = useState<"home" | "questions" | "results">(hasSearched ? "results" : "home");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState<"all" | AidCategory>("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<Set<string>>(new Set());
  const [previousCase, setPreviousCase] = useState<{ disaster: AidSituation["disaster"]; location: string; label: string } | null>(null);
  const [caseError, setCaseError] = useState(false);
  const [suggestedSituation, setSuggestedSituation] = useState<AidSituation | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const prior = readSavedAgentCase();
    if (!prior) return;
    let live = true;
    api.scenario(prior.scenario).then((s) => {
      if (live) setPreviousCase({ disaster: s.hazard === "flood" ? "flood" : "wildfire", location: s.place, label: `${s.title}${s.hypothetical ? " · hypothetical demo" : " · demo scenario"}` });
    }).catch(() => { if (live) setCaseError(true); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!hasSearched) return;
    const controller = new AbortController();
    setSearch({ status: "loading" });
    demoAidAdapter.discover(situation, controller.signal).then(({ programs }) => {
      if (!controller.signal.aborted) setSearch({ status: "done", programs });
    }).catch((error) => { if (!controller.signal.aborted) setSearch({ status: "error", message: error instanceof Error ? error.message : "We couldn’t load resources. Please try again." }); });
    return () => controller.abort();
  }, [situation, hasSearched, attempt]);

  function navigate(next: typeof view) {
    setView(next);
    requestAnimationFrame(() => { titleRef.current?.focus(); window.scrollTo({ top: 0, behavior: "instant" }); });
  }
  function discover(next: AidSituation, filter: typeof category = "all") {
    setSuggestedSituation(null);
    setSituation({ ...next, location: next.location.trim() }); setHasSearched(true); setCategory(filter);
    setQuery(""); setSavedOnly(false); setSelected(null); setAttempt((n) => n + 1); navigate("results");
  }
  function updatePrep(id: string, next: AidPreparation) { setPreparations((p) => ({ ...p, [id]: next })); }
  function ask(program: AidProgram | null) {
    setAgentDraft({ programName: program?.name ?? "Disaster assistance", text: buildAidRequest(program, situation) });
    router.push("/agent");
  }
  function clear() {
    setSituation(EMPTY_SITUATION); setPreparations({}); setAgentDraft(null); setHasSearched(false);
    setSearch({ status: "idle" }); setSelected(null); setPreparing(new Set()); navigate("home");
  }
  const programs = search.status === "done" ? search.programs : [];
  const shown = programs.filter((p) => (category === "all" || p.category === category) && (!savedOnly || preparations[p.id]?.saved)
    && `${p.name} ${p.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const hasDetails = Boolean(situation.disaster || situation.location || situation.housing || situation.needs.length || situation.applied);

  return <div className="aid-layout">
    <aside className="aid-rail print:hidden" aria-label="Recovery tools">
      <div className="flex flex-col gap-2">
        {[{ href: "/", label: "Home", icon: House }, { href: "/agent", label: `Ask ${brand.agentName}`, icon: MessageCircle }, { href: "/claims#memory", label: "Memory Web", icon: Network }, { href: "/aid", label: "Aid Autopilot", icon: LifeBuoy }, { href: "/claims", label: "Claim inventory", icon: Package }].map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={href === "/aid" ? "page" : undefined} className={`flex min-h-14 items-center gap-3 rounded-full px-4 text-sm font-medium ${href === "/aid" ? "bg-accent-soft text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"}`}><Icon className={`size-5 shrink-0 ${href === "/aid" ? "text-accent" : ""}`} aria-hidden />{label}</Link>)}
      </div>
      <p className="mt-auto flex items-start gap-3 border-t border-line pt-6 text-xs leading-relaxed text-muted"><CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden /><span>General guidance, not insurance or legal advice. In an emergency, <a href="tel:911" className="font-semibold text-danger underline">call 911.</a></span></p>
    </aside>
    <div className="aid-main">
      {view === "questions" ? <>
        <h1 ref={titleRef} tabIndex={-1} className="sr-only">Describe your situation</h1>
        <SituationForm initial={suggestedSituation ?? situation} onCancel={() => { setSuggestedSituation(null); navigate(hasSearched ? "results" : "home"); }} onComplete={(s) => discover(s)} />
      </> : <>
        {view === "home" ? <header className="aid-hero">
          <div className="relative z-10">
            <span className="aid-feature-label"><LifeBuoy className="size-4 text-accent" aria-hidden />Aid Autopilot</span>
            <h1 ref={titleRef} tabIndex={-1} className="aid-heading">Discover assistance you may be eligible for.</h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">Let us find the right programs and resources based on your situation.</p>
            <Button variant="primary" size="lg" className="mt-7" onClick={() => navigate("questions")}>Find my resources<ArrowRight className="size-5" aria-hidden /></Button>
            <p className="mt-3 text-xs text-muted">Demo discovery. A few optional questions. No account or uploads needed.</p>
          </div>
          <div className="aid-art" aria-hidden>
            <span className="aid-art-blue" /><span className="aid-art-coral" />
            <svg className="aid-art-line" viewBox="0 0 360 350"><path d="M160 310C120 140 220 30 340 5" fill="none" stroke="var(--ink)" strokeWidth="1.3" /></svg>
            {/* eslint-disable-next-line @next/next/no-img-element -- retained local, optimized reference asset */}
            <img src="/hero/earthquake-768.webp" width={768} height={420} alt="" className="aid-art-photo" decoding="async" />
          </div>
        </header> : <header className="mb-7">
          <Button variant="ghost" size="sm" onClick={() => navigate("home")} className="mb-5"><ArrowLeft className="size-4" aria-hidden />Aid Autopilot</Button>
          <h1 ref={titleRef} tabIndex={-1} className="page-title">Resources worth exploring</h1>
          <p className="mt-3 text-muted">A starting point for your next step. The provider makes the eligibility decision.</p>
        </header>}

        <section className="aid-situation" aria-labelledby="aid-situation-title">
          <House className="mt-1 hidden size-8 shrink-0 sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="aid-situation-title" className="text-2xl">Your situation</h2>
            <p className="mt-2 text-sm text-muted">{hasDetails ? "Based on details you shared and confirmed. You can update them at any time." : "Tell us a little about what happened. Your photos and claim evidence are not used."}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SituationChip icon={House} text={situation.disaster ? situation.disaster[0].toUpperCase() + situation.disaster.slice(1) : "Disaster not set"} />
              <SituationChip icon={UserRound} text={situation.housing === "rent" ? "Renter" : situation.housing === "own" ? "Homeowner" : situation.housing === "other" ? "Other housing" : "Housing not set"} />
              <SituationChip icon={MapPin} text={situation.location || "Location not set"} />
              {situation.needs.map((need) => <SituationChip key={need} icon={Check} text={NEED_LABELS[need]} />)}
            </div>
            {previousCase && !hasDetails && <div className="mt-5 border-t border-line pt-4 text-sm text-muted">
              <p>A previous conversation uses <strong className="text-ink">{previousCase.label}</strong>. This is demo context, not a verified home location.</p>
              <Button size="sm" className="mt-3" onClick={() => { setSuggestedSituation({ ...situation, disaster: previousCase.disaster, location: previousCase.location }); navigate("questions"); }}>Review these demo details</Button>
            </div>}
            {caseError && <p className="mt-3 text-xs text-muted">Previous demo details couldn’t be loaded. You can enter your situation instead.</p>}
          </div>
          <Button onClick={() => navigate("questions")} size="sm"><Pencil className="size-4" aria-hidden />{hasDetails ? "Update" : "Add details"}</Button>
        </section>

        {view === "home" ? <section className="mt-9" aria-labelledby="aid-support-title">
          <div className="mb-6 flex items-start gap-3"><LifeBuoy className="mt-1 size-6 text-accent" aria-hidden /><div><h2 id="aid-support-title" className="text-2xl">Support to explore</h2><p className="mt-2 text-sm text-muted">Start with what you need most. Availability and eligibility still need checking.</p></div></div>
          <div className="grid gap-4 xl:grid-cols-3">{CATEGORIES.map(({ id, icon: Icon, body }) => <Card key={id} className="aid-category p-5">
            <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-blue-soft text-blue"><Icon className="size-5" aria-hidden /></div><h3 className="text-xl">{CATEGORY_LABELS[id]}</h3><p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
            <button onClick={() => discover(situation, id)} className="mt-4 flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-semibold"><span className="sr-only">Explore {CATEGORY_LABELS[id]}</span><ArrowRight className="size-5" aria-hidden /></button>
          </Card>)}</div>
        </section> : <section className="mt-7" aria-label="Assistance resources">
          <Notice tone="blue" icon={<ShieldCheck className="size-4" />}><strong>Demo discovery.</strong> Sample records link to real provider guidance. Your location, current program availability, and eligibility have not been verified.</Notice>
          <div className="my-6 flex flex-wrap items-center gap-2" aria-label="Filter resources">
            {(["all", ...CATEGORIES.map((c) => c.id)] as const).map((key) => <button key={key} onClick={() => setCategory(key)} aria-pressed={category === key} className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${category === key ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:border-ink"}`}>{key === "all" ? "All resources" : CATEGORY_LABELS[key]}</button>)}
            <button onClick={() => setSavedOnly((v) => !v)} aria-pressed={savedOnly} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${savedOnly ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface text-ink"}`}><Bookmark className="size-4" aria-hidden />Saved links</button>
          </div>
          <label className="mb-6 flex min-h-12 items-center gap-3 rounded-xl border border-line-strong bg-surface px-4"><Search className="size-4 shrink-0 text-muted" aria-hidden /><span className="sr-only">Search resources</span><input value={query} onChange={(e) => setQuery(e.target.value)} maxLength={100} placeholder="Search resources" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" /></label>
          {(search.status === "loading" || search.status === "idle") && <div role="status" className="flex flex-col gap-4"><p className="text-sm text-muted">Finding resources to explore…</p><Skeleton className="h-44 w-full rounded-3xl" /><Skeleton className="h-44 w-full rounded-3xl" /></div>}
          {search.status === "error" && <Card className="p-7"><div role="alert"><Notice tone="danger" icon={<CircleAlert className="size-4" />}>{search.message}</Notice></div><Button className="mt-5" onClick={() => setAttempt((n) => n + 1)}><RotateCcw className="size-4" aria-hidden />Try again</Button></Card>}
          {search.status === "done" && <>
            <p className="mb-4 text-sm text-muted" role="status">{shown.length} resource{shown.length === 1 ? "" : "s"} to explore{savedOnly ? " · saved links only" : ""}</p>
            {!shown.length && <Card><EmptyState icon={<Search className="size-5" />} title={savedOnly ? "No saved links in this view" : "No resources in this view"} body="Try another category or clear the filters. This demo catalog is a starting point, not a complete list of local support." action={<Button onClick={() => { setCategory("all"); setSavedOnly(false); setQuery(""); }}>Clear filters</Button>} /></Card>}
            <div className="flex flex-col gap-4">{shown.map((program) => <ResourceCard key={program.id} program={program} open={selected === program.id} onToggle={() => setSelected(selected === program.id ? null : program.id)} preparing={preparing.has(program.id)} onPrepare={() => { setPreparing((p) => new Set(p).add(program.id)); setSelected(program.id); }} situation={situation} prep={preparations[program.id] ?? EMPTY_PREPARATION} onChange={(p) => updatePrep(program.id, p)} onAsk={() => ask(program)} />)}</div>
          </>}
        </section>}

        <Card className="aid-assistant mt-8 flex flex-wrap items-center gap-5 bg-blue-soft p-6 sm:p-7">
          <MessageCircle className="size-8 shrink-0 text-blue" aria-hidden /><div className="min-w-0 flex-1"><h2 className="text-xl">Need help applying?</h2><p className="mt-2 max-w-xl text-sm text-muted">{brand.agentName} can help explain requirements, gather documents, and prepare application answers.</p><p className="mt-2 text-xs text-muted">A request is prepared for your review. Nothing is sent until you press Send; notes and checklists are excluded.</p></div>
          <Button onClick={() => ask(programs.find((p) => p.id === selected) ?? null)} variant="primary">Ask {brand.agentName}<ArrowRight className="size-4" aria-hidden /></Button>
        </Card>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-muted print:hidden"><p>Details and progress stay in memory. Reloading clears them. No applications are submitted here.</p>{(hasDetails || hasSearched || Object.keys(preparations).length > 0) && <Button variant="ghost" size="sm" onClick={clear}>Clear my aid details</Button>}</div>
      </>}
    </div>
  </div>;
}

function SituationChip({ icon: Icon, text }: { icon: typeof House; text: string }) {
  return <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-medium"><Icon className="size-3.5 shrink-0" aria-hidden /><span className="break-words">{text}</span></span>;
}
