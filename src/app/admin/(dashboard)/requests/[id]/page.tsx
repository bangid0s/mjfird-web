import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import FileLinks, { signFiles } from "@/components/commissions/FileLinks";
import MessageThread from "@/components/commissions/MessageThread";
import OrderSummary from "@/components/commissions/OrderSummary";
import StatusChip from "@/components/commissions/StatusChip";
import Timeline from "@/components/commissions/Timeline";
import { DeliveryUploader, StatusActions, WorkStagesAdmin } from "@/components/admin/RequestActions";
import { workStagesOf } from "@/lib/commissions/work-stages";
import { postAdminMessage } from "@/lib/admin/requests-actions";
import { formatDate } from "@/lib/admin/format";
import { priceOf, toNumber } from "@/lib/commissions/status";
import { isQuoteRequest } from "@/lib/commissions/quote";
import { formatUSD } from "@/lib/services/storefront";
import { safeDeliveryUrl } from "@/lib/commissions/delivery-link";
import Link from "next/link";
import { parseStoredRoles } from "@/lib/discord/perks";
import { markRequestNotificationsRead } from "@/lib/notifications/read";
import type { CommissionMessageRow, CommissionRequestRow, TestimonialRow } from "@/lib/supabase/types";

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border border-line bg-bg-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-body font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("commission_requests").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const req = data as CommissionRequestRow;
  await markRequestNotificationsRead(supabase, id);

  const [{ data: msgs }, refs, deliveries, { data: reviewRow }, { data: clientProfile }, { data: discordRow }] = await Promise.all([
    supabase.from("commission_messages").select("*").eq("request_id", id).order("created_at"),
    signFiles(supabase, req.reference_paths),
    signFiles(supabase, req.delivery_paths),
    supabase.from("testimonials").select("*").eq("request_id", id).maybeSingle(),
    supabase.from("client_profiles").select("region, discord, x_handle, social_url").eq("id", req.client_id).maybeSingle(),
    supabase
      .from("client_discord_links")
      .select("discord_username, discord_user_id, in_guild, past_client, synced_at, roles")
      .eq("client_id", req.client_id)
      .maybeSingle(),
  ]);
  const work = workStagesOf(req);
  const verifiedDiscord = discordRow as {
    discord_username: string;
    discord_user_id: string;
    in_guild: boolean;
    past_client: boolean;
    synced_at: string;
    roles: unknown;
  } | null;
  const discountAmount = toNumber(req.discount_amount ?? 0) ?? 0;
  const discountNote =
    discountAmount > 0
      ? `Already includes ${req.discount_label ?? "Discount"} −${toNumber(req.discount_percent ?? 0)}% (−${formatUSD(discountAmount)}) from a verified Discord role.`
      : null;
  const client = clientProfile as { region: string; discord: string; x_handle: string; social_url: string } | null;
  const review = reviewRow as TestimonialRow | null;
  const deliveryFiles = req.delivery_paths.map((path) => {
    const signed = deliveries.find((d) => d.path === path);
    return { path, name: signed?.name ?? path.split("/").pop() ?? path, url: signed?.url ?? "#" };
  });

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={`#${req.ref} · ${req.service_title}`}
        description={`${req.contact_name} · ${req.contact_email} · ${formatDate(req.created_at)}`}
        backHref="/admin/requests"
        backLabel="Requests"
      />

      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip status={req.status} />
          {req.waitlisted && <span className="font-mono text-label uppercase text-ink-faint">Waitlist</span>}
        </div>
        <Timeline status={req.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Brief">
            <p className="whitespace-pre-line text-body text-pretty text-ink">{req.brief}</p>
            {req.answers.length > 0 && (
              <dl className="flex flex-col gap-4 border-t border-line pt-4">
                {req.answers.map((a) => (
                  <div key={a.id} className="flex flex-col gap-1">
                    <dt className="text-[13px] font-medium text-ink-muted">{a.label}</dt>
                    <dd className="whitespace-pre-line text-body-sm text-ink">{Array.isArray(a.value) ? a.value.join(", ") : a.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Panel>

          <Panel
            title={`References (${refs.length})`}
            action={
              refs.length > 0 && (
                <a
                  href={`/admin/requests/${id}/files?kind=references`}
                  download
                  className="text-body-sm font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  Download all (.zip)
                </a>
              )
            }
          >
            <FileLinks files={refs} />
          </Panel>

          {work && (
            <Panel title="Work stages">
              <WorkStagesAdmin id={req.id} stages={work.stages} index={work.index} />
            </Panel>
          )}

          <Panel title="Messages">
            <MessageThread
              messages={(msgs as CommissionMessageRow[]) ?? []}
              action={postAdminMessage.bind(null, id)}
              viewer="admin"
              artistName="You"
              clientName={req.contact_name}
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Actions">
            <StatusActions
              id={req.id}
              status={req.status}
              estimate={priceOf(req)}
              quote={isQuoteRequest(req)}
              note={req.artist_note}
              paymentUrl={req.payment_url}
              discountNote={discountNote}
            />
          </Panel>
          <Panel title="Order">
            <OrderSummary req={req} />
          </Panel>
          {["in_progress", "delivered", "completed"].includes(req.status) && (
            <Panel
              title="Delivery"
              action={
                deliveryFiles.length > 1 && (
                  <a
                    href={`/admin/requests/${id}/files?kind=deliveries`}
                    download
                    className="text-body-sm font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    Download all (.zip)
                  </a>
                )
              }
            >
              <DeliveryUploader id={req.id} clientId={req.client_id} files={deliveryFiles} deliveryUrl={safeDeliveryUrl(req.delivery_url)} />
            </Panel>
          )}
          {req.status === "completed" && (
            <Panel title="Client review">
              {review ? (
                <div className="flex flex-col gap-3">
                  {review.rating ? (
                    <p className="text-accent" aria-label={`${review.rating} out of 5 stars`}>
                      {"★".repeat(review.rating)}
                      <span className="text-line">{"★".repeat(5 - review.rating)}</span>
                    </p>
                  ) : null}
                  <blockquote className="whitespace-pre-line text-body-sm text-ink">{review.quote}</blockquote>
                  <p className="text-[13px] text-ink-muted">
                    {!review.public_consent
                      ? "Private feedback (client didn't allow publishing)."
                      : review.status === "published"
                        ? "Published."
                        : "Waiting for your approval."}
                  </p>
                  <Link href={`/admin/testimonials/${review.id}`} className="text-body-sm font-medium text-ink-muted hover:text-ink">
                    Open review →
                  </Link>
                </div>
              ) : (
                <p className="text-body-sm text-ink-muted">No review yet. The client was invited to leave one when you marked it completed.</p>
              )}
            </Panel>
          )}
          <Panel title="Client">
            <p className="text-body-sm text-ink">{req.contact_name}</p>
            <a href={`mailto:${req.contact_email}?subject=${encodeURIComponent(`Your request #${req.ref}`)}`} className="text-body-sm text-ink-muted hover:text-accent">
              {req.contact_email}
            </a>
            {verifiedDiscord && (
              <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-body-sm">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-ink-faint">Discord</dt>
                  <dd className="min-w-0 text-ink">
                    <span className="select-all">{verifiedDiscord.discord_username || verifiedDiscord.discord_user_id}</span>{" "}
                    <span className="text-[13px] text-ink-faint">· verified</span>
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-ink-faint">Roles</dt>
                  <dd className="text-ink">
                    {verifiedDiscord.in_guild
                      ? parseStoredRoles(verifiedDiscord.roles)
                          .map((r) => r.name)
                          .join(" · ") || "Member"
                      : "Not in the server"}
                  </dd>
                </div>
                <p className="text-[13px] text-ink-faint">Checked {formatDate(verifiedDiscord.synced_at)}</p>
              </dl>
            )}
            {client && (client.region || client.discord || client.x_handle || client.social_url) && (
              <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-body-sm">
                {client.region && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-ink-faint">Region</dt>
                    <dd className="text-ink">{client.region}</dd>
                  </div>
                )}
                {client.discord && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-ink-faint">Discord</dt>
                    <dd className="select-all text-ink">{client.discord}</dd>
                  </div>
                )}
                {client.x_handle && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-ink-faint">X</dt>
                    <dd>
                      <a href={`https://x.com/${client.x_handle}`} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-accent">
                        @{client.x_handle}
                      </a>
                    </dd>
                  </div>
                )}
                {client.social_url && (
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-ink-faint">Link</dt>
                    <dd className="min-w-0">
                      <a href={client.social_url} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-ink hover:text-accent">
                        {client.social_url.replace(/^https?:\/\//, "")}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
