"use client";

// Step 4: replacement-cost estimates (each with a verified retail source) and the
// claim downloads. Only confirmed items are exported.

import { useMemo, useState } from "react";
import { ArrowLeft, Check, CircleDollarSign, ExternalLink, FileSpreadsheet, FileText, Info, Sheet } from "lucide-react";
import type { InventoryItem, PhotoMeta } from "@shared/types";
import type { ClaimSession } from "@/lib/useClaimSession";
import { pool, type ExportFormat } from "@/lib/api";
import { ItemCrop, colorFor } from "@/components/PhotoWithMasks";
import { Badge, Button, Card, Notice, Pulse, Stat } from "@/components/ui";

const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function ExportStep({ session, onBack }: { session: ClaimSession; onBack: () => void }) {
  const { items, photos, valuing, valueItem, photoUrl, exportUrl } = session;
  const [valuingAll, setValuingAll] = useState(false);

  const metaById = useMemo(() => {
    const m: Record<string, PhotoMeta> = {};
    photos.forEach((p) => p.meta && (m[p.meta.photo_id] = p.meta));
    return m;
  }, [photos]);

  const confirmed = Object.values(items).filter((i) => i.user_confirmed).sort((a, b) => a.category.localeCompare(b.category));
  const valued = confirmed.filter((i) => i.estimated_replacement_usd);
  const low = valued.reduce((s, i) => s + i.estimated_replacement_usd!.low, 0);
  const high = valued.reduce((s, i) => s + i.estimated_replacement_usd!.high, 0);
  const pending = confirmed.filter((i) => !i.estimated_replacement_usd && valuing[i.id]?.status !== "loading");

  async function valueAll() {
    setValuingAll(true);
    await pool(pending.map((i) => i.id), 4, valueItem);
    setValuingAll(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-blue text-pin-ink sm:size-20" aria-hidden>
                <Check className="size-9" strokeWidth={2.5} />
              </span>
              <div>
                <h2 className="text-3xl sm:text-5xl">Your claim is ready.</h2>
                <p className="mt-1 text-muted">
                  {confirmed.length} item{confirmed.length === 1 ? "" : "s"} confirmed with photos
                  {valued.length ? " and estimated values" : ""}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid w-full gap-5 rounded-2xl border border-line bg-surface-2 px-6 py-5 sm:grid-cols-2 sm:divide-x sm:divide-line [&>div+div]:sm:pl-6">
                <Stat label="Confirmed items" value={confirmed.length} />
                <Stat label="Estimated value" value={valued.length ? `${money(low)} – ${money(high)}` : "—"}
                  hint={valued.length < confirmed.length ? `${valued.length} of ${confirmed.length} items priced` : "All items priced"} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="size-4" aria-hidden /> Back</Button>
                <Button size="sm" variant="secondary" disabled={!pending.length} loading={valuingAll} onClick={valueAll}>
                  <CircleDollarSign className="size-4" aria-hidden /> Estimate {pending.length ? `${pending.length} ` : ""}price{pending.length === 1 ? "" : "s"}
                </Button>
              </div>
            </div>
          </div>
          <DocumentArt />
        </div>
      </Card>

      <Card className="divide-y divide-line">
        {confirmed.map((item) => {
          const meta = metaById[item.photos[0]?.photo_id];
          return (
            <PriceRow key={item.id} item={item} meta={meta} src={meta ? photoUrl(meta.photo_id) : ""}
              state={valuing[item.id]} onValue={() => valueItem(item.id)} />
          );
        })}
      </Card>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <Card className="flex flex-col gap-4 p-6">
          <div>
            <h3 className="text-xl">Download your claim</h3>
            <p className="mt-1 text-sm text-muted">A file with your items, photos and price estimates. Photo location data is never included.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Download href={exportUrl("pdf")} fmt="pdf" icon={<FileText className="size-4" />} title="PDF report" primary />
            <Download href={exportUrl("xlsx")} fmt="xlsx" icon={<FileSpreadsheet className="size-4" />} title="Excel spreadsheet" />
            <Download href={exportUrl("csv")} fmt="csv" icon={<Sheet className="size-4" />} title="CSV" />
          </div>
          <Notice icon={<Info className="size-4" />}>
            Prices are estimates from public retail listings for a comparable new item, not appraisals. Check them before you
            submit. This is not insurance or legal advice.
          </Notice>
        </Card>
        <Card className="p-6">
          <h3 className="text-xl">What’s included</h3>
          <ul className="mt-3 flex flex-col gap-2 text-[15px]">
            {["Item list with estimated values", "Evidence photos (with dates)", "Condition of each item", "Price sources and when they were checked"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="size-4 shrink-0 text-ink" strokeWidth={2.5} aria-hidden /> {t}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// A flat document illustration with blue and coral shapes (decoration only).
function DocumentArt() {
  return (
    <svg viewBox="0 0 200 160" className="hidden w-60 lg:block" aria-hidden>
      <path d="M18 120c-8-30 14-58 44-60s40 30 26 52-62 38-70 8z" fill="var(--deco-coral)" />
      <rect x="70" y="18" width="92" height="118" rx="10" transform="rotate(8 116 77)" fill="var(--deco-blue)" />
      <rect x="58" y="14" width="92" height="118" rx="10" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
      {[38, 52, 66, 80].map((y, k) => (
        <rect key={y} x="72" y={y} width={k === 3 ? 40 : 64} height="6" rx="3" fill="var(--deco-blue)" opacity={k === 0 ? 1 : 0.45} />
      ))}
      <path d="M170 30l10-8M174 44h12M168 18l4-12" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PriceRow({ item, meta, src, state, onValue }: {
  item: InventoryItem; meta: PhotoMeta | undefined; src: string;
  state: ClaimSession["valuing"][string] | undefined; onValue: () => void;
}) {
  const est = item.estimated_replacement_usd;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="size-12 shrink-0 overflow-hidden rounded-lg">
        {meta && <ItemCrop src={src} meta={meta} mask={item.photos[0]?.mask ?? null} color={colorFor(0)} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold capitalize">
          {item.category}
          {(item.brand || item.model) && <span className="font-normal normal-case text-muted"> · {[item.brand, item.model].filter(Boolean).join(" ")}</span>}
        </p>
        <p className="text-xs text-muted">
          {item.photos.length} photo{item.photos.length === 1 ? "" : "s"} · condition {item.condition}
        </p>
      </div>
      <div className="flex min-w-0 max-w-[45%] flex-col items-end gap-0.5 text-right">
        {est ? (
          <>
            <span className="font-semibold tabular-nums">{money(est.low)} – {money(est.high)}</span>
            <a href={est.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate text-xs text-accent hover:underline" title={est.basis}>
              <span className="truncate">{est.source_title || new URL(est.source_url).hostname}</span>
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
            <span className="text-[11px] text-subtle">checked {new Date(est.checked_at).toLocaleDateString()}</span>
          </>
        ) : state?.status === "loading" ? (
          <Badge tone="accent" icon={<Pulse className="size-1.5" />}>Searching retailers</Badge>
        ) : state?.status === "error" ? (
          <>
            <span className="text-xs text-warn">{state.error}</span>
            <Button size="sm" variant="ghost" onClick={onValue}>Try again</Button>
          </>
        ) : (
          <Button size="sm" onClick={onValue}>Estimate price</Button>
        )}
      </div>
    </div>
  );
}

function Download({ href, fmt, icon, title, primary = false }: {
  href: string; fmt: ExportFormat; icon: React.ReactNode; title: string; primary?: boolean;
}) {
  return (
    <a href={href} download aria-label={`Download ${title} (.${fmt})`}
      className={`inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold transition ${
        primary ? "bg-ink text-white hover:bg-[#2b2b2b]" : "border border-ink bg-surface text-ink hover:bg-surface-2"}`}>
      {icon} {title}
    </a>
  );
}
