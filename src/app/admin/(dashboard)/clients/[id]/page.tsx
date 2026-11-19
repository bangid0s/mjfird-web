import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import ClientAvatar from "@/components/admin/ClientAvatar";
import StatusChip from "@/components/commissions/StatusChip";
import { formatDate, timeAgo } from "@/lib/admin/format";
import { formatUSD } from "@/lib/services/storefront";
import { priceLabel } from "@/lib/commissions/quote";
import { orderStats, type ClientProfile } from "@/lib/admin/clients";
import { PROFILE_COLUMNS } from "@/lib/admin/clients-data";
import type { CommissionRequestRow } from "@/lib/supabase/types";

type OrderRow = Pick<
  CommissionRequestRow,
  "id" | "ref" | "client_id" | "service_title" | "package_id" | "package_name" | "status" | "final_price" | "estimated_total" | "created_at"
>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: profileData }, { data: orderData }, { data: discordData }] = await Promise.all([
    supabase.from("client_profiles").select(PROFILE_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("commission_requests")
      .select("id, ref, client_id, service_title, package_id, package_name, status, final_price, estimated_total, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("client_discord_links").select("discord_username, in_guild").eq("client_id", id).maybeSingle(),
  ]);
  if (!profileData) notFound();

  const client = profileData as unknown as ClientProfile;
  const orders = (orderData as OrderRow[]) ?? [];
  const verifiedDiscord = discordData as { discord_username: string; in_guild: boolean } | null;
  const stats = orderStats(orders);
  const average = stats.paidOrders > 0 ? stats.spent / stats.paidOrders : 0;
  const name = client.display_name || client.email || "Client";

  const details: [string, React.ReactNode][] = [
    ["Email", <a key="e" href={`mailto:${client.email}`} className="break-all text-ink hover:text-accent">{client.email}</a>],
    ["Joined", formatDate(client.created_at)],
  ];
  if (client.region) details.push(["Region", client.region]);
  if (client.discord) details.push(["Discord", <span key="d" className="select-all">{client.discord}</span>]);
  if (verifiedDiscord?.discord_username && verifiedDiscord.discord_username !== client.discord)
    details.push(["Discord ✓", <span key="dv" className="select-all">{verifiedDiscord.discord_username}</span>]);
  if (client.x_handle)
    details.push([
      "X",
      <a key="x" href={`https://x.com/${client.x_handle}`} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-accent">
        @{client.x_handle}
      </a>,
    ]);
  if (client.social_url)
    details.push([
      "Link",
      <a key="s" href={client.social_url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-ink hover:text-accent">
        {client.social_url.replace(/^https?:\/\//, "")}
      </a>,
    ]);

  return (
    <div className="max-w-5xl">
      <PageHeader title={name} description={client.email} backHref="/admin/clients" backLabel="Clients" />

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <section className="flex flex-col gap-5 self-start border border-line bg-bg-raised p-5">
          <div className="flex items-center gap-4">
            <ClientAvatar name={name} url={client.avatar_url} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-ink">{client.display_name || "(no name)"}</p>
              <p className="text-body-sm text-ink-muted">
                {stats.paidOrders > 0 ? "Paying client" : stats.orders > 0 ? "Has ordered" : "Never ordered"}
              </p>
            </div>
          </div>
          <dl className="flex flex-col gap-2 border-t border-line pt-4 text-body-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="w-20 shrink-0 text-ink-faint">{label}</dt>
                <dd className="min-w-0 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {[
              ["Orders", String(stats.orders)],
              ["Paid", String(stats.paidOrders)],
              ["Lifetime value", formatUSD(stats.spent)],
              ["Average order", stats.paidOrders > 0 ? formatUSD(average) : "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 bg-bg-raised px-5 py-4">
                <dt className="text-body-sm text-ink-muted">{label}</dt>
                <dd className="font-mono text-[20px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <section className="flex flex-col gap-4 border border-line bg-bg-raised p-5">
            <h2 className="text-body font-semibold text-ink">Order history</h2>
            {orders.length === 0 ? (
              <p className="text-body-sm text-ink-muted">
                No orders yet. They signed up {timeAgo(client.created_at)}, so a friendly follow-up could turn this into a first
                commission.
              </p>
            ) : (
              <ul className="-mx-5 flex flex-col divide-y divide-line border-t border-line">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/requests/${o.id}`}
                      className="grid gap-2 px-5 py-4 transition-colors hover:bg-bg sm:grid-cols-[4.5rem_1fr_auto_auto] sm:items-center sm:gap-6"
                    >
                      <span className="font-mono text-label text-ink-faint">#{o.ref}</span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-body text-ink">{o.service_title}</span>
                        <span className="truncate text-body-sm text-ink-muted">
                          {o.package_name} · {formatDate(o.created_at)}
                        </span>
                      </span>
                      <span className="text-body text-ink">{priceLabel(o)}</span>
                      <StatusChip status={o.status} className="justify-self-start" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
