import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FileLinks, { signFiles } from "@/components/commissions/FileLinks";
import MessageThread from "@/components/commissions/MessageThread";
import OrderSummary from "@/components/commissions/OrderSummary";
import StatusChip from "@/components/commissions/StatusChip";
import Timeline from "@/components/commissions/Timeline";
import CancelRequestButton from "@/components/commissions/CancelRequestButton";
import { PayPalCheckout } from "@/components/commissions/PayPalCheckout";
import { requireUser } from "@/lib/auth/session";
import { paypalButtonAvailable, readPaypalSandboxConfig } from "@/lib/payments/config";
import { postClientMessage } from "@/lib/client/request-actions";
import { STATUS_HINT, STATUS_LABEL } from "@/lib/commissions/status";
import type { CommissionMessageRow, CommissionRequestRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Request", robots: { index: false } };

export default async function ClientRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { id } = await params;
  const { submitted } = await searchParams;
  const { supabase } = await requireUser(`/account/requests/${id}`);

  const { data } = await supabase.from("commission_requests").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const req = data as CommissionRequestRow;
  const paypal = readPaypalSandboxConfig();
  const paypalClientId =
    paypal && paypalButtonAvailable(paypal, { status: req.status, currency: req.currency, finalPrice: req.final_price })
      ? paypal.publicClientId
      : null;

  const [{ data: msgs }, refs, deliveries] = await Promise.all([
    supabase.from("commission_messages").select("*").eq("request_id", id).order("created_at"),
    signFiles(supabase, req.reference_paths),
    signFiles(supabase, req.delivery_paths),
  ]);

  return (
    <div className="container-page pb-[var(--space-section)] pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/account" className="spec text-ink-muted transition-colors hover:text-accent">
          ← My requests
        </Link>
      </nav>

      {submitted && (
        <p role="status" className="mb-8 border border-accent/40 bg-bg-raised px-5 py-4 text-body text-ink">
          Request sent! I&apos;ll review it and reply here — you&apos;ll get an email too.
        </p>
      )}

      <header className="mb-10 flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="mono-meta">Request #{req.ref}</span>
          <StatusChip status={req.status} />
          {req.waitlisted && req.status === "pending" && <span className="mono-meta">Waitlist</span>}
        </div>
        <h1 className="display-lg text-balance">{req.service_title}</h1>
        <Timeline status={req.status} />
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16">
        <div className="flex min-w-0 flex-col gap-10">
          <section className="flex flex-col gap-2 border-l-2 border-accent pl-5">
            <p className="text-body font-medium text-ink">{STATUS_LABEL[req.status]}</p>
            <p className="text-body-sm text-pretty text-ink-muted">{STATUS_HINT[req.status]}</p>
            {req.artist_note && (
              <p className="mt-2 whitespace-pre-line text-body-sm text-ink">
                <span className="mono-meta mr-2">Note from MJFIRD</span>
                {req.artist_note}
              </p>
            )}
          </section>

          {deliveries.length > 0 && (
            <section className="flex flex-col gap-4 border-t border-line pt-8">
              <h2 className="eyebrow">Your files</h2>
              <FileLinks files={deliveries} />
            </section>
          )}

          <section className="flex flex-col gap-4 border-t border-line pt-8">
            <h2 className="eyebrow">Messages</h2>
            <MessageThread
              messages={(msgs as CommissionMessageRow[]) ?? []}
              action={postClientMessage.bind(null, id)}
              viewer="client"
              clientName={req.contact_name}
            />
          </section>

          <section className="flex flex-col gap-4 border-t border-line pt-8">
            <h2 className="eyebrow">Your brief</h2>
            <p className="whitespace-pre-line text-body text-pretty text-ink">{req.brief}</p>
            {req.answers.length > 0 && (
              <dl className="flex flex-col gap-4 pt-2">
                {req.answers.map((a) => (
                  <div key={a.id} className="flex flex-col gap-1">
                    <dt className="mono-meta">{a.label}</dt>
                    <dd className="whitespace-pre-line text-body-sm text-ink">{Array.isArray(a.value) ? a.value.join(", ") : a.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <h3 className="eyebrow mt-4">References</h3>
            <FileLinks files={refs} />
          </section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start">
          <div className="flex flex-col gap-5 border border-line bg-bg-raised/60 p-5 sm:p-6">
            <p className="eyebrow">Order</p>
            <OrderSummary req={req} />
            {paypalClientId ? (
              <PayPalCheckout requestId={req.id} clientId={paypalClientId} />
            ) : req.status === "awaiting_payment" ? (
              <p className="border border-accent/40 px-4 py-3 text-body-sm text-ink">
                Payment via PayPal is coming here shortly — I&apos;ll message you with the payment link.
              </p>
            ) : null}
          </div>
          {(req.status === "pending" || req.status === "awaiting_payment") && <CancelRequestButton requestId={req.id} />}
        </aside>
      </div>
    </div>
  );
}
