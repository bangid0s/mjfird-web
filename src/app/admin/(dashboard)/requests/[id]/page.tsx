import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/admin/PageHeader";
import FileLinks, { signFiles } from "@/components/commissions/FileLinks";
import MessageThread from "@/components/commissions/MessageThread";
import OrderSummary from "@/components/commissions/OrderSummary";
import StatusChip from "@/components/commissions/StatusChip";
import Timeline from "@/components/commissions/Timeline";
import { DeliveryUploader, StatusActions } from "@/components/admin/RequestActions";
import { postAdminMessage } from "@/lib/admin/requests-actions";
import { formatDate } from "@/lib/admin/format";
import { priceOf } from "@/lib/commissions/status";
import Link from "next/link";
import type { CommissionMessageRow, CommissionRequestRow, TestimonialRow } from "@/lib/supabase/types";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border border-line bg-bg-raised p-5">
      <h2 className="text-body font-semibold text-ink">{title}</h2>
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

  const [{ data: msgs }, refs, deliveries, { data: reviewRow }] = await Promise.all([
    supabase.from("commission_messages").select("*").eq("request_id", id).order("created_at"),
    signFiles(supabase, req.reference_paths),
    signFiles(supabase, req.delivery_paths),
    supabase.from("testimonials").select("*").eq("request_id", id).maybeSingle(),
  ]);
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

          <Panel title={`References (${refs.length})`}>
            <FileLinks files={refs} />
          </Panel>

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
            <StatusActions id={req.id} status={req.status} estimate={priceOf(req)} note={req.artist_note} paymentUrl={req.payment_url} />
          </Panel>
          <Panel title="Order">
            <OrderSummary req={req} />
          </Panel>
          {["in_progress", "delivered", "completed"].includes(req.status) && (
            <Panel title="Delivery">
              <DeliveryUploader id={req.id} clientId={req.client_id} files={deliveryFiles} />
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
          </Panel>
        </div>
      </div>
    </div>
  );
}
