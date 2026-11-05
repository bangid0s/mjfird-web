import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import StatusChip from "@/components/commissions/StatusChip";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/admin/format";
import { OPEN_STATUSES, priceOf } from "@/lib/commissions/status";
import { formatUSD } from "@/lib/services/storefront";
import type { CommissionRequestRow, CommissionStatus } from "@/lib/supabase/types";

const FILTERS: { value: string; label: string; match: (s: CommissionStatus) => boolean }[] = [
  { value: "open", label: "Open", match: (s) => OPEN_STATUSES.includes(s) },
  { value: "pending", label: "Needs review", match: (s) => s === "pending" },
  { value: "awaiting_payment", label: "Awaiting payment", match: (s) => s === "awaiting_payment" },
  { value: "in_progress", label: "In progress", match: (s) => s === "in_progress" },
  { value: "closed", label: "Closed", match: (s) => !OPEN_STATUSES.includes(s) },
  { value: "all", label: "All", match: () => true },
];

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = FILTERS.find((f) => f.value === status) ?? FILTERS[0];

  const supabase = await createClient();
  const { data } = await supabase.from("commission_requests").select("*").order("created_at", { ascending: false });
  const all = (data as CommissionRequestRow[]) ?? [];
  const rows = all.filter((r) => filter.match(r.status));

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Requests"
        description="Commission requests from client accounts. Accept with a final price, decline with a note, and move work along."
      />

      {all.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="When a client requests a service from /services, it lands here and you get an email."
          ctaHref="/admin/services"
          ctaLabel="Set up services"
        />
      ) : (
        <>
          <div role="tablist" aria-label="Filter requests" className="mb-6 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
            {FILTERS.map((f) => {
              const active = f.value === filter.value;
              const count = all.filter((r) => f.match(r.status)).length;
              return (
                <Link
                  key={f.value}
                  role="tab"
                  aria-selected={active}
                  href={f.value === "open" ? "/admin/requests" : `/admin/requests?status=${f.value}`}
                  className={cn(
                    "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-body-sm transition-colors",
                    active ? "border-accent font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
                  )}
                >
                  {f.label}
                  <span className="min-w-5 px-1.5 text-center font-mono text-[11px] text-ink-faint">{count}</span>
                </Link>
              );
            })}
          </div>

          {rows.length === 0 ? (
            <p className="py-10 text-body-sm text-ink-muted">Nothing here.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line border border-line bg-bg-raised">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/requests/${r.id}`}
                    className="grid gap-2 px-5 py-4 transition-colors hover:bg-bg sm:grid-cols-[4.5rem_1fr_auto_auto] sm:items-center sm:gap-6"
                  >
                    <span className="font-mono text-label text-ink-faint">#{r.ref}</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-body text-ink">
                        {r.contact_name} — {r.service_title}
                      </span>
                      <span className="truncate text-body-sm text-ink-muted">
                        {r.package_name}
                        {r.addons.length > 0 && ` + ${r.addons.length} add-on${r.addons.length > 1 ? "s" : ""}`} · {timeAgo(r.created_at)}
                        {r.waitlisted && " · waitlist"}
                      </span>
                    </span>
                    <span className="text-body text-ink">{formatUSD(priceOf(r))}</span>
                    <StatusChip status={r.status} className="justify-self-start" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
