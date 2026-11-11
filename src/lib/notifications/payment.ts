import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL, sendEmail } from "@/lib/email";
import { paymentAdminEmail, paymentClientEmail } from "@/lib/notifications/copy";

/** True only for a capture this call settled for the first time. */
export function isFreshCapture(result: { status: number; body: unknown }) {
  const body = result.body as { ok?: unknown; duplicate?: unknown } | null;
  return result.status === 200 && body?.ok === true && body.duplicate === false;
}

/**
 * Email client + studio once a PayPal order is settled. Uses the service-role
 * client (the webhook has no session). Never throws: a failed email must not
 * turn a successful payment into an error response.
 */
export async function notifyPaymentReceived(admin: SupabaseClient, orderId: string) {
  try {
    const { data: checkout } = await admin
      .from("commission_paypal_checkouts")
      .select("request_id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (!checkout?.request_id) return;
    const { data: req } = await admin
      .from("commission_requests")
      .select("id, ref, contact_name, contact_email, service_title, package_name, final_price")
      .eq("id", checkout.request_id)
      .maybeSingle();
    if (!req) return;

    const client = paymentClientEmail(req);
    const studio = paymentAdminEmail(req);
    await Promise.all([
      sendEmail({ to: req.contact_email, ...client }),
      sendEmail({ to: ADMIN_EMAIL, ...studio, replyTo: req.contact_email }),
    ]);
  } catch (err) {
    console.error("[email] payment notification failed", err instanceof Error ? err.message : err);
  }
}

/** The PayPal order id inside a PAYMENT.CAPTURE.COMPLETED webhook body. */
export function webhookOrderId(rawBody: string): string | null {
  try {
    const id = JSON.parse(rawBody)?.resource?.supplementary_data?.related_ids?.order_id;
    return typeof id === "string" && id ? id : null;
  } catch {
    return null;
  }
}
