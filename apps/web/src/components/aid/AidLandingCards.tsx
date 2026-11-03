"use client";

import { ArrowRight, Banknote, ChevronRight, Flame, House, LifeBuoy, MapPin, MessageCircle, Package, Pencil, UserRound, Waves, type LucideIcon } from "lucide-react";
import brand from "@shared/brand.json";
import { CATEGORY_LABELS, type AidCategory, type AidSituation } from "@/lib/aidAutopilot";
import { Button, Card } from "@/components/ui";
import "./AidLandingCards.css";

export const AID_CATEGORIES: { id: AidCategory; icon: LucideIcon; body: string }[] = [
  { id: "financial", icon: Banknote, body: "Explore help with disaster-related costs and getting back on your feet." },
  { id: "housing", icon: House, body: "Find a starting point for shelter and temporary housing support." },
  { id: "essentials", icon: Package, body: "Look for help with food, medicine, and the things you need each day." },
];

type PreviousCase = { disaster: AidSituation["disaster"]; location: string; label: string };

export function AidLandingCards({ situation, hasDetails, previousCase, caseError, onDetails, onPrevious, onExplore, onAsk }: {
  situation: AidSituation;
  hasDetails: boolean;
  previousCase: PreviousCase | null;
  caseError: boolean;
  onDetails: () => void;
  onPrevious: () => void;
  onExplore: (category: AidCategory) => void;
  onAsk: () => void;
}) {
  const disaster = situation.disaster ? situation.disaster[0].toUpperCase() + situation.disaster.slice(1) : "Disaster not set";
  const housing = situation.housing === "rent" ? "Renter" : situation.housing === "own" ? "Homeowner" : situation.housing === "other" ? "Other housing" : "Housing not set";
  const DisasterIcon = situation.disaster === "flood" ? Waves : situation.disaster === "wildfire" ? Flame : LifeBuoy;

  return <Card className="aid-overview-card" data-tour="aid-landing-cards">
    <section className="aid-overview-col" aria-labelledby="aid-situation-title">
      <div className="aid-overview-heading"><IconBadge icon={House} /><h2 id="aid-situation-title">Your situation</h2></div>
      <p className="aid-overview-description">Tell us a little about what happened. Your photos and claim evidence are not used.</p>
      <div className="aid-overview-action"><Button size="sm" onClick={onDetails}><Pencil className="size-4" aria-hidden />{hasDetails ? "Update" : "Add details"}</Button></div>
      <div className="aid-overview-list">
        <DetailRow label="Disaster" value={disaster} filled={!!situation.disaster} icon={DisasterIcon} onClick={onDetails} />
        <DetailRow label="Housing" value={housing} filled={!!situation.housing} icon={UserRound} tone="accent" onClick={onDetails} />
        <DetailRow label="Location" value={situation.location || "Location not set"} filled={!!situation.location} icon={MapPin} onClick={onDetails} />
      </div>
      {previousCase && !hasDetails && <div className="mt-5 text-sm text-muted">
        <p>A previous conversation uses <strong className="text-ink">{previousCase.label}</strong>. This is demo context, not a verified home location.</p>
        <Button size="sm" className="mt-3" onClick={onPrevious}>Review these demo details</Button>
      </div>}
      {caseError && <p className="mt-3 text-xs text-muted">Previous demo details couldn’t be loaded. You can enter your situation instead.</p>}
    </section>

    <section className="aid-overview-col" aria-labelledby="aid-support-title">
      <div className="aid-overview-heading"><IconBadge icon={LifeBuoy} tone="accent" /><h2 id="aid-support-title">Support to explore</h2></div>
      <p className="aid-overview-description">Start with what you need most. Availability and eligibility still need checking.</p>
      <div className="aid-overview-action aid-overview-action-spacer" aria-hidden="true" />
      <div className="aid-overview-list">
        {AID_CATEGORIES.map(({ id, icon, body }) => <SupportRow key={id} label={CATEGORY_LABELS[id]} description={body} icon={icon} onClick={() => onExplore(id)} />)}
      </div>
    </section>

    <section className="aid-overview-col aid-overview-col-assistant" aria-labelledby="aid-assistant-title" data-tour="aid-assistant">
      <div className="aid-overview-heading"><IconBadge icon={MessageCircle} /><h2 id="aid-assistant-title">Need help applying?</h2></div>
      <p className="aid-overview-description">{brand.agentName} can help explain requirements, gather documents, and prepare application answers.</p>
      <div className="aid-overview-action"><Button variant="primary" onClick={onAsk}>Ask {brand.agentName}<ArrowRight className="size-4" aria-hidden /></Button></div>
      <p className="aid-overview-note">A request is prepared for your review. Nothing is sent until you press Send; notes and checklists are excluded.</p>
      <AidDocumentsArt />
    </section>
  </Card>;
}

function IconBadge({ icon: Icon, tone = "blue" }: { icon: LucideIcon; tone?: "blue" | "accent" }) {
  return <span className={`aid-icon-badge ${tone === "accent" ? "aid-icon-badge-accent" : ""}`}><Icon className="size-6" strokeWidth={1.8} aria-hidden /></span>;
}

function DetailRow({ label, value, filled, icon, tone, onClick }: { label: string; value: string; filled: boolean; icon: LucideIcon; tone?: "blue" | "accent"; onClick: () => void }) {
  return <button type="button" className="aid-overview-row" onClick={onClick} aria-label={`${label}, ${filled ? value : "not set"}. ${filled ? "Edit" : "Set"}`}>
    <IconBadge icon={icon} tone={tone} />
    <span className="aid-overview-row-copy"><span className="aid-overview-row-title">{label}</span><span className="aid-overview-row-subtitle">{value}</span></span>
    <span className="aid-overview-row-action">{filled ? "Edit" : "Set"}<ChevronRight className="aid-overview-chevron size-5" aria-hidden /></span>
  </button>;
}

function SupportRow({ label, description, icon, onClick }: { label: string; description: string; icon: LucideIcon; onClick: () => void }) {
  return <button type="button" className="aid-overview-row" onClick={onClick} aria-label={`Explore ${label}`}>
    <IconBadge icon={icon} />
    <span className="aid-overview-row-copy"><span className="aid-overview-row-title">{label}</span><span className="aid-overview-row-subtitle">{description}</span></span>
    <span className="aid-overview-row-action">Explore<ChevronRight className="aid-overview-chevron size-5" aria-hidden /></span>
  </button>;
}

function AidDocumentsArt() {
  return <svg className="aid-overview-illustration" viewBox="0 0 320 230" role="presentation" aria-hidden="true" focusable="false">
    <path d="M20 185 143 120 301 190 177 227Z" fill="var(--blue-soft)" />
    <path d="M72 53 172 20 217 43 118 77Z" fill="var(--surface)" stroke="var(--blue)" strokeWidth="3" strokeLinejoin="round" />
    <path d="M72 53v119l46 24V77Z" fill="var(--surface-2)" stroke="var(--blue)" strokeWidth="3" strokeLinejoin="round" />
    <path d="m118 77 99-34v120l-99 33Z" fill="var(--surface)" stroke="var(--blue)" strokeWidth="3" strokeLinejoin="round" />
    <path d="m139 106 53-18m-53 35 53-18m-53 35 53-18" stroke="var(--blue)" strokeWidth="4" strokeLinecap="round" />
    <path d="m136 142 63-21v80l-63 21Z" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" strokeLinejoin="round" />
    <path d="m147 168 7 6 10-17m-17 39 7 6 10-17" fill="none" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m170 163 20-7m-20 36 20-7" stroke="var(--blue)" strokeWidth="3" strokeLinecap="round" />
    <path d="m216 122 43-21 42 22-43 21Z" fill="var(--accent-soft)" />
    <path d="m216 122 42 22v52l-42-22Zm42 22 43-21v51l-43 22Z" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" strokeLinejoin="round" />
    <path d="m208 129 50-42 51 42-18 8-33-28-33 28Z" fill="var(--accent)" />
    <path d="m268 173 12-6v20l-12 5Z" fill="var(--blue)" />
  </svg>;
}
