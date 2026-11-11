import type { CommissionRequestRow } from "@/lib/supabase/types";
import { priceOf, toNumber } from "@/lib/commissions/status";
import { formatUSD } from "@/lib/services/storefront";

export default function OrderSummary({ req }: { req: CommissionRequestRow }) {
  const finalPrice = toNumber(req.final_price);
  const estimate = toNumber(req.estimated_total) ?? 0;
  const unit = toNumber(req.package_price) ?? 0;
  const extra = req.extra_characters ?? 0;
  return (
    <dl className="flex flex-col gap-3 text-body-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-ink-muted">{req.package_name}</dt>
        <dd className="text-ink">{formatUSD(unit)}</dd>
      </div>
      {extra > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">
            + {extra} extra character{extra === 1 ? "" : "s"} × {formatUSD(unit)}
          </dt>
          <dd className="text-ink">{formatUSD(unit * extra)}</dd>
        </div>
      )}
      {req.addons.map((a) => (
        <div key={a.id} className="flex justify-between gap-3">
          <dt className="text-ink-muted">+ {a.name}</dt>
          <dd className="text-ink">{formatUSD(toNumber(a.price) ?? 0)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-line pt-3">
        <dt className="text-ink-muted">Estimate</dt>
        <dd className={finalPrice !== null && finalPrice !== estimate ? "text-ink-faint line-through" : "text-ink"}>
          {formatUSD(estimate)}
        </dd>
      </div>
      {finalPrice !== null && (
        <div className="flex items-baseline justify-between gap-3">
          <dt className="font-medium text-ink">Final price</dt>
          <dd className="display-sm">{formatUSD(priceOf(req))}</dd>
        </div>
      )}
      {(req.delivery_days || req.revisions !== null) && (
        <div className="mono-meta flex gap-4 pt-1">
          {req.delivery_days ? <span>{req.delivery_days} days</span> : null}
          {req.revisions !== null && <span>{req.revisions} revisions</span>}
        </div>
      )}
    </dl>
  );
}
