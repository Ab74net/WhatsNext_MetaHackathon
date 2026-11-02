"use client";

// Step 4: replacement-cost estimates (each with a verified retail source) and the
// claim downloads. Only confirmed items are exported.

import { useMemo, useState } from "react";
import { ArrowLeft, CircleDollarSign, ExternalLink, FileSpreadsheet, FileText, Info, Sheet } from "lucide-react";
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
      <Card className="flex flex-wrap items-center gap-x-10 gap-y-4 p-5">
        <Stat label="Confirmed items" value={confirmed.length} />
        <Stat label="Estimated replacement cost" value={valued.length ? `${money(low)} – ${money(high)}` : "—"}
          hint={valued.length < confirmed.length ? `${valued.length} of ${confirmed.length} items priced` : "All items priced"} />
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="size-4" aria-hidden /> Review</Button>
          <Button size="sm" variant="primary" disabled={!pending.length} loading={valuingAll} onClick={valueAll}>
            <CircleDollarSign className="size-4" aria-hidden /> Estimate {pending.length ? `${pending.length} ` : ""}price{pending.length === 1 ? "" : "s"}
          </Button>
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

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <p className="font-semibold">Download your claim</p>
          <p className="mt-1 text-sm text-muted">
            Each file lists your {confirmed.length} confirmed item{confirmed.length === 1 ? "" : "s"} with an evidence photo, photo
            dates and price sources. Photo location data is never included.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Download href={exportUrl("pdf")} fmt="pdf" icon={<FileText className="size-5" />} title="PDF report"
            body="For your adjuster. Evidence photo beside every item." primary />
          <Download href={exportUrl("xlsx")} fmt="xlsx" icon={<FileSpreadsheet className="size-5" />} title="Excel spreadsheet"
            body="Editable, with thumbnails and totals." />
          <Download href={exportUrl("csv")} fmt="csv" icon={<Sheet className="size-5" />} title="CSV"
            body="Plain data for insurer upload portals." />
        </div>
        <Notice icon={<Info className="size-4" />}>
          Prices are estimates from public retail listings for a comparable new item, not appraisals. Check them before you
          submit. This is not insurance or legal advice.
        </Notice>
      </Card>
    </div>
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

function Download({ href, fmt, icon, title, body, primary = false }: {
  href: string; fmt: ExportFormat; icon: React.ReactNode; title: string; body: string; primary?: boolean;
}) {
  return (
    <a href={href} download className={`flex items-start gap-3 rounded-lg border p-4 transition hover:shadow-card ${
      primary ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${primary ? "bg-accent text-accent-ink" : "bg-surface-3"}`}>{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title} <span className="font-normal uppercase text-subtle">.{fmt}</span></span>
        <span className="text-xs text-muted">{body}</span>
      </span>
    </a>
  );
}
