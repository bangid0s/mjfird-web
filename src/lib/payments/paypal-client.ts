import { z } from "zod";
import { PAYPAL_SANDBOX_API, type PaypalSandboxConfig } from "@/lib/payments/config";
import { normalizeUsd } from "@/lib/payments/money";

export class PaypalRequestError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, httpStatus: number) {
    super(code);
    this.name = "PaypalRequestError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type CaptureInterpretation =
  | {
      outcome: "completed";
      orderId: string;
      captureId: string;
      amount: string;
      currency: string;
      merchantId: string | null;
    }
  | { outcome: "not_charged" }
  | { outcome: "uncertain"; evidence: string; captureId: string | null }
  | { outcome: "hold"; captureId: string | null; evidence: string };

export type MerchantObservation = { state: "absent" } | { state: "malformed" } | { state: "present"; merchantId: string };

export type PaypalClient = {
  /** Set when PAYPAL_MERCHANT_ID is configured. Stubs may omit it. */
  merchantId?: string | null;
  createOrder(amount: string, requestId: string, ref: number, idempotencyKey: string): Promise<{ id: string }>;
  captureOrder(orderId: string, idempotencyKey: string): Promise<CaptureInterpretation>;
  verifyWebhook(headers: Headers, event: unknown): Promise<boolean>;
};

/** Payment requires a configured merchant and a payee string equal to it. */
export function merchantAllowsPayment(expected: string | null, observed: MerchantObservation): { ok: true } | { ok: false; evidence: string } {
  const configured = expected?.trim() || null;
  if (!configured) {
    if (observed.state === "present") return { ok: false, evidence: `merchant unconfigured ${observed.merchantId}` };
    if (observed.state === "malformed") return { ok: false, evidence: "merchant unconfigured malformed" };
    return { ok: false, evidence: "merchant unconfigured" };
  }
  if (observed.state === "absent") return { ok: false, evidence: "merchant missing" };
  if (observed.state === "malformed") return { ok: false, evidence: "merchant malformed" };
  if (observed.merchantId !== configured) return { ok: false, evidence: `merchant ${observed.merchantId}` };
  return { ok: true };
}

export function observeResourceMerchant(resource: unknown): MerchantObservation {
  if (typeof resource !== "object" || resource === null || Array.isArray(resource)) return { state: "absent" };
  const payee = Object.fromEntries(Object.entries(resource)).payee;
  if (typeof payee !== "object" || payee === null || Array.isArray(payee) || !("merchant_id" in payee)) return { state: "absent" };
  const merchantId = Object.fromEntries(Object.entries(payee)).merchant_id;
  if (typeof merchantId === "string" && merchantId.trim()) return { state: "present", merchantId: merchantId.trim() };
  if (merchantId == null || merchantId === "") return { state: "absent" };
  return { state: "malformed" };
}

const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
});

const createdOrderSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
});

const NOT_CHARGED = new Set(["DECLINED", "DENIED", "FAILED", "VOIDED"]);
const KNOWN_STATUS = new Set(["COMPLETED", "PENDING", "DECLINED", "DENIED", "FAILED", "VOIDED"]);

const verificationSchema = z.object({
  verification_status: z.string(),
});

const CERT_HOSTS = new Set(["api.sandbox.paypal.com", "api.paypal.com"]);

function readHeader(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value ? value : null;
}

function sandboxCertUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && CERT_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

async function readJson(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value));
}

function orderPayee(body: unknown): { id: string | null; merchant: string | null } {
  const root = asRecord(body);
  if (!root) return { id: null, merchant: null };
  const id = typeof root.id === "string" && root.id ? root.id : null;
  const units = Array.isArray(root.purchase_units) ? root.purchase_units : [];
  const unit = asRecord(units[0]);
  const payee = unit ? asRecord(unit.payee) : null;
  const merchant = payee && typeof payee.merchant_id === "string" && payee.merchant_id.trim() ? payee.merchant_id.trim() : null;
  return { id, merchant };
}

/** Copy the order-level payee onto a capture body that omitted it. */
function withOrderPayee(captureBody: unknown, orderBody: unknown): unknown {
  const order = orderPayee(orderBody);
  if (!order.merchant) return captureBody;
  const root = asRecord(captureBody);
  const units = root && Array.isArray(root.purchase_units) ? root.purchase_units : [];
  if (!root || units.length === 0) return orderBody;
  const unit = asRecord(units[0]);
  if (!unit || orderPayee(captureBody).merchant) return captureBody;
  return { ...root, purchase_units: [{ ...unit, payee: { merchant_id: order.merchant } }, ...units.slice(1)] };
}

type SeenCapture = {
  id: string | null;
  status: string | null;
  currency: string | null;
  value: string | null;
  merchant: string | null;
  merchantBad: boolean;
};

function readCaptures(root: Record<string, unknown>): SeenCapture[] {
  const units = Array.isArray(root.purchase_units) ? root.purchase_units : [];
  const seen: SeenCapture[] = [];
  for (const unitValue of units) {
    const unit = asRecord(unitValue);
    if (!unit) continue;
    const payments = asRecord(unit.payments);
    const caps = payments && Array.isArray(payments.captures) ? payments.captures : [];
    for (const capValue of caps) {
      const cap = asRecord(capValue);
      if (!cap) continue;
      const payee = asRecord(cap.payee) ?? asRecord(unit.payee);
      let merchant: string | null = null;
      let merchantBad = false;
      if (payee && "merchant_id" in payee && payee.merchant_id != null && payee.merchant_id !== "") {
        if (typeof payee.merchant_id === "string") merchant = payee.merchant_id;
        else merchantBad = true;
      }
      const amount = asRecord(cap.amount);
      seen.push({
        id: typeof cap.id === "string" && cap.id ? cap.id : null,
        status: typeof cap.status === "string" && cap.status ? cap.status : null,
        currency: amount && typeof amount.currency_code === "string" ? amount.currency_code : null,
        value: amount && typeof amount.value === "string" ? amount.value : null,
        merchant,
        merchantBad,
      });
    }
  }
  return seen;
}

/** Classify a capture HTTP 200. A charge is paid only when every status agrees. */
export function interpretCapture(requestedOrderId: string, expectedMerchant: string | null, body: unknown): CaptureInterpretation {
  const root = asRecord(body);
  if (!root) return { outcome: "uncertain", captureId: null, evidence: "unparsed" };
  const responseOrderId = typeof root.id === "string" && root.id ? root.id : null;
  const orderStatus = typeof root.status === "string" && root.status ? root.status : null;
  const seen = readCaptures(root);
  const ids = seen.map((item) => item.id).filter((id): id is string => id !== null);
  const listed = seen
    .map((item) => {
      const merchant = item.merchantBad ? "merchant malformed" : item.merchant ? `merchant ${item.merchant}` : "merchant missing";
      return `${item.id ?? "unknown"}:${item.status ?? "unknown"} ${merchant}`;
    })
    .join(" ");
  const uncertain = (evidence: string, captureId: string | null): CaptureInterpretation => ({ outcome: "uncertain", captureId, evidence });
  const soleId = ids.length === 1 ? ids[0] ?? null : null;

  if (responseOrderId && responseOrderId !== requestedOrderId) {
    return { outcome: "hold", captureId: ids[0] ?? null, evidence: `order ${responseOrderId}${ids.length ? ` ${ids.join(" ")}` : ""}${listed ? ` ${listed}` : ""}` };
  }
  if (seen.length === 0) {
    if (orderStatus && NOT_CHARGED.has(orderStatus)) return { outcome: "not_charged" };
    return uncertain(orderStatus ? `no-captures ${orderStatus}` : "no-captures", null);
  }

  const parent = orderStatus ? ` parent:${orderStatus}` : "";
  const amounts = seen.map((item) => `${item.id ?? "unknown"} ${item.currency ?? "?"} ${item.value ?? "?"}`).join(" ");
  for (const item of seen) {
    const observed: MerchantObservation = item.merchantBad ? { state: "malformed" } : item.merchant ? { state: "present", merchantId: item.merchant } : { state: "absent" };
    const decision = merchantAllowsPayment(expectedMerchant, observed);
    if (!decision.ok) {
      return { outcome: "hold", captureId: soleId, evidence: `${listed}${parent} ${decision.evidence} ${amounts}`.trim() };
    }
  }

  const statuses = [orderStatus, ...seen.map((item) => item.status)].filter((status): status is string => Boolean(status));
  const completed = seen.filter((item) => item.status === "COMPLETED");
  const contradicts = statuses.includes("COMPLETED") && statuses.some((status) => NOT_CHARGED.has(status));
  const pending = seen.some((item) => item.status === "PENDING");
  const unknown = statuses.some((status) => !KNOWN_STATUS.has(status)) || seen.some((item) => !item.status);
  if (contradicts || completed.length > 1 || (pending && completed.length > 0)) {
    return { outcome: "hold", captureId: soleId, evidence: `${listed}${parent}`.trim() };
  }
  if (pending || unknown) return uncertain(`${listed}${parent}`.trim(), soleId);
  if (completed.length === 0 && statuses.every((status) => NOT_CHARGED.has(status))) return { outcome: "not_charged" };

  const one = completed[0];
  if (!one?.id) return uncertain(listed || "incomplete-capture", null);
  if (one.merchantBad) return { outcome: "hold", captureId: one.id, evidence: `${one.id} merchant malformed` };
  const amount = one.value ? normalizeUsd(one.value) : null;
  if (!amount || !one.currency || !responseOrderId) return uncertain(one.id, one.id);
  if (expectedMerchant && one.merchant !== expectedMerchant) {
    return { outcome: "hold", captureId: one.id, evidence: `merchant ${one.merchant ?? "missing"}` };
  }
  return { outcome: "completed", orderId: responseOrderId, captureId: one.id, amount, currency: one.currency, merchantId: one.merchant };
}

export function createPaypalSandboxClient(
  config: PaypalSandboxConfig,
  fetchImpl: typeof fetch = fetch,
): PaypalClient {
  async function accessToken(): Promise<string> {
    const res = await fetchImpl(`${PAYPAL_SANDBOX_API}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new PaypalRequestError("token", res.status);
    const parsed = tokenSchema.safeParse(await readJson(res));
    if (!parsed.success || parsed.data.token_type.toLowerCase() !== "bearer") {
      throw new PaypalRequestError("token_shape", res.status);
    }
    return parsed.data.access_token;
  }

  return {
    merchantId: config.merchantId,
    async createOrder(amount, requestId, ref, idempotencyKey) {
      const token = await accessToken();
      const res = await fetchImpl(`${PAYPAL_SANDBOX_API}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": idempotencyKey,
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              custom_id: requestId,
              invoice_id: `MJF-${ref}`,
              amount: { currency_code: "USD", value: amount },
            },
          ],
        }),
      });
      if (!res.ok) throw new PaypalRequestError("create_order", res.status);
      const parsed = createdOrderSchema.safeParse(await readJson(res));
      if (!parsed.success || parsed.data.status !== "CREATED") {
        throw new PaypalRequestError("create_order_shape", res.status);
      }
      return { id: parsed.data.id };
    },

    async captureOrder(orderId, idempotencyKey) {
      if (!/^[A-Za-z0-9-]+$/.test(orderId)) throw new PaypalRequestError("order_id", 400);
      const token = await accessToken();
      const res = await fetchImpl(`${PAYPAL_SANDBOX_API}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": idempotencyKey,
          Prefer: "return=representation",
        },
      });
      if (!res.ok) throw new PaypalRequestError("capture", res.status);
      let body = await readJson(res);
      if (!orderPayee(body).merchant) {
        const lookedUp = await fetchImpl(`${PAYPAL_SANDBOX_API}/v2/checkout/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (lookedUp.ok) {
          const orderBody = await readJson(lookedUp);
          if (orderPayee(orderBody).id === orderId) body = withOrderPayee(body, orderBody);
        }
      }
      return interpretCapture(orderId, config.merchantId, body);
    },

    async verifyWebhook(headers, event) {
      const transmissionId = readHeader(headers, "paypal-transmission-id");
      const transmissionTime = readHeader(headers, "paypal-transmission-time");
      const transmissionSig = readHeader(headers, "paypal-transmission-sig");
      const certUrl = readHeader(headers, "paypal-cert-url");
      const authAlgo = readHeader(headers, "paypal-auth-algo");
      if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) return false;
      if (!sandboxCertUrl(certUrl)) return false;

      const token = await accessToken();
      const res = await fetchImpl(`${PAYPAL_SANDBOX_API}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: config.webhookId,
          webhook_event: event,
        }),
      });
      if (!res.ok) return false;
      const parsed = verificationSchema.safeParse(await readJson(res));
      return parsed.success && parsed.data.verification_status === "SUCCESS";
    },
  };
}
