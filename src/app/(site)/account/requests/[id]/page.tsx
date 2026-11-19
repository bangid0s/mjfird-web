import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { signFiles } from "@/components/commissions/FileLinks";
import { PayPalCheckout } from "@/components/commissions/PayPalCheckout";
import { RequestPayment } from "@/components/commissions/RequestPayment";
import RequestDetail from "@/components/account/RequestDetail";
import { requireUser } from "@/lib/auth/session";
import { markRequestNotificationsRead } from "@/lib/notifications/read";
import { clientPaymentView } from "@/lib/commissions/payment-link";
import { safeDeliveryUrl } from "@/lib/commissions/delivery-link";
import { nextStep } from "@/lib/commissions/next-step";
import { paypalButtonAvailable, readPaypalSandboxConfig } from "@/lib/payments/config";
import { postClientMessage, reviewWorkStage, submitReview } from "@/lib/client/request-actions";
import { loadStageEvents } from "@/lib/commissions/stage-events";
import type { CommissionMessageRow, CommissionRequestRow, TestimonialRow } from "@/lib/supabase/types";

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
  const paymentView = clientPaymentView({
    status: req.status,
    paymentUrl: req.payment_url,
    finalPrice: req.final_price,
    checkoutAvailable: paypalClientId !== null,
  });

  const [{ data: msgs }, refs, deliveries, { data: reviewRow }, , stageEvents] = await Promise.all([
    supabase.from("commission_messages").select("*").eq("request_id", id).order("created_at"),
    signFiles(supabase, req.reference_paths),
    signFiles(supabase, req.delivery_paths),
    req.status === "completed"
      ? supabase
          .from("testimonials")
          .select("quote, name, role, rating, public_consent, status")
          .eq("request_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    markRequestNotificationsRead(supabase, id),
    loadStageEvents(supabase, id),
  ]);
  const review = reviewRow as Pick<TestimonialRow, "quote" | "name" | "role" | "rating" | "public_consent" | "status"> | null;
  const canPay = paymentView.kind === "link" || paymentView.kind === "checkout";

  return (
    <RequestDetail
      req={req}
      step={nextStep({ ...req, hasReview: Boolean(review), canPay })}
      messages={(msgs as CommissionMessageRow[]) ?? []}
      refs={refs}
      deliveries={deliveries}
      deliveryUrl={safeDeliveryUrl(req.delivery_url)}
      review={review}
      payment={
        canPay ? (
          <RequestPayment
            view={paymentView}
            checkout={paymentView.kind === "checkout" && paypalClientId ? <PayPalCheckout requestId={req.id} clientId={paypalClientId} /> : null}
          />
        ) : null
      }
      submitted={Boolean(submitted)}
      postMessage={postClientMessage.bind(null, id)}
      submitReview={submitReview.bind(null, id)}
      stageEvents={stageEvents}
      reviewStage={reviewWorkStage.bind(null, id)}
    />
  );
}
