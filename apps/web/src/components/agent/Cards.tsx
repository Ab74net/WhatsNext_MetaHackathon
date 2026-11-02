"use client";

// One component per UI instruction the assistant can return. Every fact shown here
// came from a tool (official feeds or the curated content), never from model text.

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CalendarClock, ChevronDown, CircleCheck, ExternalLink, Flame, Info, ListChecks, MapPin, Package,
  Phone, Radio, Sun, TriangleAlert,
} from "lucide-react";
import type { AlertsCard, ClaimStart, PlanCard, PlanItem, ResourceList, ToolkitLink, UIInstruction } from "@shared/types";
import { Badge, Card } from "@/components/ui";
import { KIND_STYLE } from "./MapPanel";
import { SafetyFlowView } from "./SafetyFlow";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const day = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function SourceLink({ name, url, checked, type }: { name: string; url: string; checked?: string; type?: "official" | "news" }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-subtle hover:text-accent">
      {type === "news" && <span className="rounded bg-surface-3 px-1 font-semibold">News</span>}
      {name}{checked ? ` · checked ${day(checked)}` : ""} <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

function CardHeader({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-4 py-3">
      <span className="text-accent">{icon}</span>
      <p className="flex-1 font-semibold">{title}</p>
      {right}
    </div>
  );
}

export function AlertsView({ card }: { card: AlertsCard }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader icon={<TriangleAlert className="size-[18px]" />} title="Alerts" />
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-[13px]">
          <Radio className={`mt-0.5 size-4 shrink-0 ${card.live_error ? "text-warn" : "text-good"}`} aria-hidden />
          <div className="flex-1">
            {card.live_error ? <span>{card.live_error} Check weather.gov or local news.</span>
              : card.live.length ? <span className="font-semibold">{card.live.length} active alert{card.live.length === 1 ? "" : "s"} from the National Weather Service</span>
              : <span>Live now: <strong>no active National Weather Service alerts</strong> for this area.</span>}
            <span className="block text-[11px] text-subtle">
              Checked {time(card.live_checked_at)} · <a href={card.live_source_url} target="_blank" rel="noopener noreferrer" className="hover:text-accent">api.weather.gov</a>
            </span>
          </div>
        </div>

        {card.live.map((a) => (
          <div key={a.id} className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5">
            <p className="text-sm font-semibold text-danger">{a.title}</p>
            <p className="mt-0.5 text-[13px]">{a.headline}</p>
            <SourceLink name={a.source_name} url={a.source_url} />
          </div>
        ))}

        {card.recorded.map((a) => (
          <div key={a.id} className={`rounded-lg px-3 py-2.5 ${a.severity === "extreme" ? "border border-warn/40 bg-warn-soft" : "bg-surface-2"}`}>
            <div className="flex items-center gap-2">
              <p className={`flex-1 text-sm font-semibold ${a.severity === "extreme" ? "text-warn" : ""}`}>{a.title}</p>
              <Badge>Recorded {a.effective ? day(a.effective) : ""}</Badge>
            </div>
            <p className="mt-0.5 text-[13px]">{a.headline}</p>
            <p className="mt-0.5 text-xs text-muted">{a.description}</p>
            <div className="mt-1"><SourceLink name={a.source_name} url={a.source_url} type={a.source_type} /></div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-1.5">
          {card.fire_areas.map((f) => (
            <span key={f.name} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-xs font-medium">
              <Flame className="size-3 text-[#ea580c]" aria-hidden /> {f.name} · {f.acres.toLocaleString()} acres
            </span>
          ))}
        </div>
        {card.fire_areas_source && (
          <SourceLink name={card.fire_areas_source.name} url={card.fire_areas_source.url} checked={card.fire_areas_source.retrieved_at} type="official" />
        )}
      </div>
    </Card>
  );
}

const BUCKETS = [
  { key: "today", label: "Today", icon: Sun },
  { key: "this_week", label: "This week", icon: ListChecks },
  { key: "deadlines", label: "Deadlines & status", icon: CalendarClock },
] as const;

export function PlanView({ card }: { card: PlanCard }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader icon={<ListChecks className="size-[18px]" />} title="Your plan"
        right={<span className="text-xs text-subtle">{card.phase_label || (card.phase === "response" ? "During the disaster" : "Recovery")}</span>} />
      <div className="divide-y divide-line">
        {BUCKETS.map(({ key, label, icon: Icon }) => card[key].length > 0 && (
          <div key={key} className="grid gap-2 px-4 py-3 sm:grid-cols-[7.5rem_1fr]">
            <p className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-accent" aria-hidden /> {label}</p>
            <ul className="flex flex-col gap-1">{card[key].map((item) => <PlanRow key={item.program_id} item={item} />)}</ul>
          </div>
        ))}
        {card.deadlines.length === 0 && (
          <p className="px-4 py-3 text-[13px] text-muted">No official deadlines have been announced yet. We only show deadlines from a published source.</p>
        )}
      </div>
    </Card>
  );
}

function PlanRow({ item }: { item: PlanItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg hover:bg-surface-2">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-2 px-2 py-1.5 text-left text-sm">
        {item.status === "available"
          ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
          : <Info className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />}
        <span className="flex-1">{item.text}</span>
        {item.status === "pending" && <Badge tone="warn">Pending</Badge>}
        {item.status === "not_available" && <Badge>Not available</Badge>}
        <ChevronDown className={`mt-0.5 size-4 shrink-0 text-subtle transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 px-8 pb-2.5 text-[13px]">
          <p className="text-muted">{item.status_note ?? item.detail}</p>
          {item.amount && <p><span className="font-semibold">Amount:</span> {item.amount}</p>}
          {item.deadline_note && <p><span className="font-semibold">Deadline:</span> {item.deadline_note}</p>}
          <div className="flex flex-wrap gap-1.5">
            {item.how.map((h) => h.action === "start_claim" ? (
              <Link key={h.label} href="/claims" className="inline-flex h-7 items-center gap-1 rounded-md bg-accent px-2.5 text-xs font-semibold text-accent-ink">{h.label}</Link>
            ) : h.url ? (
              <a key={h.label} href={h.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md bg-surface-3 px-2.5 text-xs font-semibold">
                {h.label} <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : h.phone ? (
              <a key={h.label} href={`tel:${h.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-7 items-center gap-1 rounded-md bg-surface-3 px-2.5 text-xs font-semibold">
                <Phone className="size-3" aria-hidden /> {h.label}
              </a>
            ) : (
              <span key={h.label} className="inline-flex items-center rounded-md bg-surface-2 px-2.5 py-1 text-xs">{h.label}</span>
            ))}
          </div>
          <SourceLink name={item.source_name} url={item.source_url} checked={item.checked_at} />
        </div>
      )}
    </li>
  );
}

export function ResourcesView({ card, selectedId, onSelect }: { card: ResourceList; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader icon={<MapPin className="size-[18px]" />} title="Places near you" right={<span className="text-xs text-subtle">On the map</span>} />
      <ul className="divide-y divide-line">
        {card.items.map((r) => (
          <li key={r.id}>
            <button onClick={() => onSelect(r.id)} className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition ${selectedId === r.id ? "bg-accent-soft" : "hover:bg-surface-2"}`}>
              <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: KIND_STYLE[r.kind].color }} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug">{r.name}</span>
                <span className="block truncate text-xs text-muted">{r.address}</span>
                {r.hours && <span className="block text-xs text-subtle">{r.hours}</span>}
              </span>
              <span className="text-[11px] font-semibold text-muted">{KIND_STYLE[r.kind].label}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-2 text-xs text-muted">{card.note}</p>
    </Card>
  );
}

export function ClaimStartView({ card }: { card: ClaimStart }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"><Package className="size-5" aria-hidden /></span>
      <div className="flex-1">
        <p className="text-sm font-semibold">Rebuild your home inventory for your claim</p>
        <p className="text-xs text-muted">{card.reason || "Your camera roll already shows much of what you owned."}</p>
      </div>
      <Link href="/claims" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-ink">
        Start <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}

export function ToolkitLinkView({ card }: { card: ToolkitLink }) {
  const docs = card.tab === "documents";
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex-1">
        <p className="text-sm font-semibold">{docs ? "Replace lost documents in the right order" : "Get ready for your insurance call"}</p>
        <p className="text-xs text-muted">{card.reason || (docs ? "Some documents need another one first." : "Questions to ask, and a place for notes.")}</p>
      </div>
      <Link href={docs ? "/toolkit#documents" : "/toolkit#insurer-call"}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-ink">
        Open <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}

export function EmergencyView() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-danger-solid p-4 text-white">
      <p className="text-lg font-bold">Call 911 now</p>
      <p className="text-sm opacity-90">If anyone is hurt or in immediate danger, emergency services come first.</p>
      <a href="tel:911" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white font-bold text-danger">
        <Phone className="size-4" aria-hidden /> Call 911
      </a>
    </div>
  );
}

export function UICard({ card, selectedId, onSelect }: {
  card: UIInstruction; selectedId: string | null; onSelect: (id: string) => void;
}) {
  switch (card.type) {
    case "alerts": return <AlertsView card={card} />;
    case "plan": return <PlanView card={card} />;
    case "resources": return <ResourcesView card={card} selectedId={selectedId} onSelect={onSelect} />;
    case "claim_start": return <ClaimStartView card={card} />;
    case "toolkit_link": return <ToolkitLinkView card={card} />;
    case "emergency": return <EmergencyView />;
    case "safety_flow": return <SafetyFlowView card={card} />;
  }
}
