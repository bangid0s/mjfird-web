import { z } from "zod";
import { CheckoutDbError, type CheckoutDb } from "@/lib/payments/checkout-db";
import { normalizeUsd } from "@/lib/payments/money";
import { PaypalRequestError, type PaypalClient } from "@/lib/payments/paypal-client";

export type HttpResult = {
  status: number;
  body: { orderId: string } | { ok: true; duplicate: boolean } | { ignored: true } | { error: string };
};

type Payable = { ok: true; amount: string } | { ok: false };

function assessPayable(request: { status: string; currency: string; finalPrice: unknown }): Payable {
  if (request.status !== "awaiting_payment" || request.currency !== "USD") return { ok: false };
  const amount = normalizeUsd(request.finalPrice);
  if (!amount) return { ok: false };
  return { ok: true, amount };
}

const orderBody = z.object({ requestId: z.uuid() }).strip();
const captureBody = z.object({ orderId: z.string().trim().min(1).max(80) }).strip();

const webhookEvent = z.object({
  event_type: z.string(),
  resource: z.unknown().optional(),
});

const captureResource = z.object({
  id: z.string().min(1),
  status: z.string(),
  amount: z.object({
    currency_code: z.string(),
    value: z.string(),
  }),
  supplementary_data: z
    .object({
      related_ids: z
        .object({
          order_id: z.string().min(1),
        })
        .optional(),
    })
    .optional(),
});

const unavailable = "This quote can't be paid right now.";
const retry = "Payment couldn't finish. Refresh to confirm.";

export function orderIdempotencyKey(requestId: string) {
  return `order-${requestId}`;
}

export function captureIdempotencyKey(orderId: string) {
  return `capture-${orderId}`;
}

export async function createSandboxOrder(
  deps: { db: CheckoutDb; paypal: PaypalClient; userId: string },
  body: unknown,
): Promise<HttpResult> {
  const parsed = orderBody.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: "Invalid payment." } };

  const request = await deps.db.getRequest(parsed.data.requestId);
  if (!request) return { status: 404, body: { error: "Request not found." } };
  if (request.clientId !== deps.userId) return { status: 403, body: { error: "You can't pay this request." } };

  const price = assessPayable(request);
  if (!price.ok) return { status: 409, body: { error: unavailable } };

  const reserved = await deps.db.reserveOrder({ requestId: request.id, amount: price.amount, currency: "USD" });
  if (!reserved.ok) return { status: 409, body: { error: unavailable } };
  if (reserved.orderId) return { status: 200, body: { orderId: reserved.orderId } };

  const created = await deps.paypal.createOrder(price.amount, request.id, request.ref, orderIdempotencyKey(request.id));
  const attached = await deps.db.attachOrder({
    requestId: request.id,
    orderId: created.id,
    amount: price.amount,
    currency: "USD",
  });
  if (!attached.ok) return { status: 409, body: { error: unavailable } };
  return { status: 200, body: { orderId: attached.orderId } };
}

export async function captureSandboxOrder(
  deps: { db: CheckoutDb; paypal: PaypalClient; userId: string },
  body: unknown,
): Promise<HttpResult> {
  const parsed = captureBody.safeParse(body);
  if (!parsed.success) return { status: 400, body: { error: "Invalid payment." } };

  const checkout = await deps.db.getCheckoutByOrder(parsed.data.orderId);
  if (!checkout) return { status: 404, body: { error: "Payment not found." } };

  const request = await deps.db.getRequest(checkout.requestId);
  if (!request) return { status: 404, body: { error: "Request not found." } };
  if (request.clientId !== deps.userId) return { status: 403, body: { error: "You can't pay this request." } };

  if (!checkout.orderId) return { status: 404, body: { error: "Payment not found." } };

  const payableAmount = request.currency === "USD" ? normalizeUsd(request.finalPrice) : null;
  if (!checkout.captureId && request.status === "awaiting_payment" && payableAmount !== checkout.amount) {
    return { status: 409, body: { error: unavailable } };
  }

  const claim = await deps.db.beginCapture(checkout.orderId);
  if (!claim.ok) return { status: 409, body: { error: unavailable } };
  if (claim.state === "done") {
    const current = await deps.db.getCheckoutByOrder(checkout.orderId);
    if (!current?.captureId) return { status: 502, body: { error: retry } };
    const settled = await finishCapture(deps.db, checkout.orderId, current.captureId, current.amount);
    if (!settled) return { status: 502, body: { error: retry } };
    return { status: 200, body: { ok: true, duplicate: true } };
  }

  let captured;
  try {
    captured = await deps.paypal.captureOrder(checkout.orderId, captureIdempotencyKey(checkout.orderId));
  } catch (err) {
    if (err instanceof PaypalRequestError) return { status: 502, body: { error: retry } };
    throw err;
  }

  if (captured.status !== "COMPLETED" || captured.amount !== checkout.amount || captured.currency !== "USD") {
    await deps.db.releaseCapture(checkout.orderId);
    return { status: 409, body: { error: "Payment could not be confirmed." } };
  }

  const settled = await finishCapture(deps.db, checkout.orderId, captured.captureId, captured.amount);
  if (!settled) return { status: 502, body: { error: retry } };
  return { status: 200, body: { ok: true, duplicate: settled === "duplicate" } };
}

async function finishCapture(db: CheckoutDb, orderId: string, captureId: string, amount: string) {
  try {
    const settled = await db.completeCapture({ orderId, captureId, amount, currency: "USD" });
    if (!settled.ok) return null;
    return settled.result;
  } catch (err) {
    if (err instanceof CheckoutDbError) return null;
    throw err;
  }
}

export async function handleSandboxWebhook(
  deps: { db: CheckoutDb; paypal: PaypalClient },
  input: { headers: Headers; rawBody: string },
): Promise<HttpResult> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(input.rawBody);
  } catch {
    return { status: 400, body: { error: "Invalid webhook." } };
  }

  const verified = await deps.paypal.verifyWebhook(input.headers, parsedJson);
  if (!verified) return { status: 400, body: { error: "Invalid webhook." } };

  const event = webhookEvent.safeParse(parsedJson);
  if (!event.success) return { status: 400, body: { error: "Invalid webhook." } };
  if (event.data.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return { status: 200, body: { ignored: true } };
  }

  const resource = captureResource.safeParse(event.data.resource);
  if (!resource.success || resource.data.status !== "COMPLETED") {
    return { status: 400, body: { error: "Invalid webhook." } };
  }
  const orderId = resource.data.supplementary_data?.related_ids?.order_id;
  const amount = normalizeUsd(resource.data.amount.value);
  if (!orderId || !amount || resource.data.amount.currency_code !== "USD") {
    return { status: 200, body: { ignored: true } };
  }

  const settled = await deps.db.completeCapture({
    orderId,
    captureId: resource.data.id,
    amount,
    currency: "USD",
  });
  if (!settled.ok) return { status: 200, body: { ignored: true } };
  return { status: 200, body: { ok: true, duplicate: settled.result === "duplicate" } };
}
