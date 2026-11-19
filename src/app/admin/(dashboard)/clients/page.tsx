import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import ClientAvatar from "@/components/admin/ClientAvatar";
import { cn } from "@/lib/cn";
import { formatDate, timeAgo } from "@/lib/admin/format";
import { formatUSD } from "@/lib/services/storefront";
import { loadClientSummaries } from "@/lib/admin/clients-data";
import {
  CLIENT_FILTERS,
  CLIENT_SORTS,
  matchesFilter,
  parseFilter,
  parseSort,
  selectClients,
  type ClientFilter,
  type ClientSort,
} from "@/lib/admin/clients";

type Search = { q?: string; filter?: string; sort?: string };

/** Query string for this page (or the export), dropping defaults. */
function qs(params: { q?: string; filter?: ClientFilter; sort?: ClientSort }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.filter && params.filter !== "all") sp.set("filter", params.filter);
  if (params.sort && params.sort !== "newest") sp.set("sort", params.sort);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const filter = parseFilter(params.filter);
  const sort = parseSort(params.sort);

  const supabase = await createClient();
  const all = await loadClientSummaries(supabase);
  const rows = selectClients(all, { q, filter, sort });

  const lifetime = all.reduce((sum, c) => sum + c.spent, 0);
  const paying = all.filter((c) => c.paidOrders > 0).length;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Clients"
        description="Everyone who created an account, with their profile and order history. Accounts that never ordered are warm leads."
        action={
          all.length > 0 && (
            <a
              href={`/admin/clients/export${qs({ q, filter, sort })}`}
              download
              className="inline-flex items-center gap-2 border border-line-strong px-4 py-2.5 text-body-sm font-medium text-ink transition-colors hover:bg-bg-raised"
            >
              Export CSV{rows.length !== all.length && ` (${rows.length})`}
            </a>
          )
        }
      />

      {all.length === 0 ? (
        <EmptyState
          title="No client accounts yet"
          description="When someone signs up to request a commission, their account shows up here."
        />
      ) : (
        <>
          <dl className="mb-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {[
              ["Accounts", String(all.length)],
              ["Paying clients", String(paying)],
              ["Never ordered", String(all.filter((c) => c.orders === 0).length)],
              ["Lifetime revenue", formatUSD(lifetime)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 bg-bg-raised px-5 py-4">
                <dt className="text-body-sm text-ink-muted">{label}</dt>
                <dd className="font-mono text-[20px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <form action="/admin/clients" className="mb-4 flex flex-wrap items-center gap-3">
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search name, email, Discord, X, region"
              aria-label="Search clients"
              className="min-w-0 flex-1 border border-line bg-bg px-3 py-2 text-body-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
            />
            <label className="flex items-center gap-2 text-body-sm text-ink-muted">
              Sort
              <select
                name="sort"
                defaultValue={sort}
                className="border border-line bg-bg px-2 py-2 text-body-sm text-ink focus:border-accent focus:outline-none"
              >
                {CLIENT_SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="bg-accent px-4 py-2 text-body-sm font-medium text-accent-ink transition-[filter] hover:brightness-110">
              Apply
            </button>
          </form>

          <div role="tablist" aria-label="Filter clients" className="mb-6 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
            {CLIENT_FILTERS.map((f) => {
              const active = f.value === filter;
              const count = all.filter((c) => matchesFilter(c, f.value)).length;
              return (
                <Link
                  key={f.value}
                  role="tab"
                  aria-selected={active}
                  href={`/admin/clients${qs({ q, filter: f.value, sort })}`}
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
            <p className="py-10 text-body-sm text-ink-muted">
              No clients match{q && <> &ldquo;{q}&rdquo;</>}.{" "}
              <Link href="/admin/clients" className="text-ink underline-offset-2 hover:underline">
                Clear filters
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line border border-line bg-bg-raised">
              {rows.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/clients/${c.id}`}
                    className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-bg sm:grid-cols-[2.5rem_1fr_6rem_7rem_8rem]"
                  >
                    <ClientAvatar name={c.display_name || c.email} url={c.avatar_url} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-body text-ink">{c.display_name || "(no name)"}</span>
                      <span className="truncate text-body-sm text-ink-muted">
                        {c.email}
                        {c.region && ` · ${c.region}`}
                      </span>
                    </span>
                    <span className="text-right text-body-sm text-ink-muted sm:text-left">
                      {c.orders === 0 ? "No orders" : `${c.orders} order${c.orders > 1 ? "s" : ""}`}
                    </span>
                    <span className="col-start-2 text-body-sm text-ink sm:col-start-auto sm:text-right">
                      {c.spent > 0 ? formatUSD(c.spent) : <span className="text-ink-faint">—</span>}
                    </span>
                    <span className="col-start-3 text-right text-[13px] text-ink-faint sm:col-start-auto">
                      {c.lastOrderAt ? `Ordered ${timeAgo(c.lastOrderAt)}` : `Joined ${formatDate(c.created_at)}`}
                    </span>
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
