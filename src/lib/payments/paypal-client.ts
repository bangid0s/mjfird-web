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
  | { outcome: "uncertain"; evidence: string | null }
  | { outcome: "hold"; captureId: string | null; evidence: string };

export type PaypalClient = {
  createOrder(amount: string, requestId: string, ref: number, idempotencyKey: string): Promise<{ id: string }>;
  captureOrder(orderId: string, idempotencyKey: string): Promise<CaptureInterpretation>;
  verifyWebhook(headers: Headers, event: unknown): Promise<boolean>;
};

const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
});

const createdOrderSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
});

const captureSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
  amount: z
    .object({
      currency_code: z.string(),
      value: z.string(),
    })
    .optional(),
  payee: z.object({ merchant_id: z.string().optional() }).optional(),
});

const capturedOrderSchema = z.object({
  id: z.string().min(1).optional(),
  status: z.string().optional(),
  purchase_units: z
    .array(
      z.object({
        payee: z.object({ merchant_id: z.string().optional() }).optional(),
        payments: z.object({ captures: z.array(captureSchema).optional() }).optional(),
      }),
    )
    .optional(),
});

const NOT_CHARGED = new Set(["DECLINED", "DENIED", "FAILED", "VOIDED"]);

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

function merchantOf(capture: { payee?: { merchant_id?: string } }, unit: { payee?: { merchant_id?: string } }): string | null {
  return capture.payee?.merchant_id ?? unit.payee?.merchant_id ?? null;
}

/** Classify a capture HTTP 200. Anything that is not a proven non-charge stays uncertain or held. */
export function interpretCapture(requestedOrderId: string, expectedMerchant: string | null, body: unknown): CaptureInterpretation {
  const parsed = capturedOrderSchema.safeParse(body);
  if (!parsed.success) return { outcome: "uncertain", evidence: null };
  const responseOrderId = parsed.data.id ?? null;
  if (responseOrderId && responseOrderId !== requestedOrderId) {
    return { outcome: "hold", captureId: null, evidence: `order ${responseOrderId}` };
  }
  const units = parsed.data.purchase_units ?? [];
  const captures = units.flatMap((unit) => (unit.payments?.captures ?? []).map((capture) => ({ capture, unit })));
  if (captures.length === 0) {
    if (parsed.data.status && NOT_CHARGED.has(parsed.data.status)) return { outcome: "not_charged" };
    return { outcome: "uncertain", evidence: null };
  }
  const completed = captures.filter((item) => item.capture.status === "COMPLETED");
  if (completed.length > 1) {
    return { outcome: "uncertain", evidence: completed.map((item) => item.capture.id).join(" ") };
  }
  if (completed.length === 0) {
    if (captures.every((item) => NOT_CHARGED.has(item.capture.status))) return { outcome: "not_charged" };
    return { outcome: "uncertain", evidence: captures.map((item) => `${item.capture.id}:${item.capture.status}`).join(" ") };
  }
  const one = completed[0];
  if (!one) return { outcome: "uncertain", evidence: null };
  const amount = one.capture.amount ? normalizeUsd(one.capture.amount.value) : null;
  const currency = one.capture.amount?.currency_code ?? "";
  const merchantId = merchantOf(one.capture, one.unit);
  if (!amount || !responseOrderId) return { outcome: "uncertain", evidence: one.capture.id };
  if (expectedMerchant && merchantId !== expectedMerchant) {
    return { outcome: "hold", captureId: one.capture.id, evidence: `merchant ${merchantId ?? "missing"}` };
  }
  return { outcome: "completed", orderId: responseOrderId, captureId: one.capture.id, amount, currency, merchantId };
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
        },
      });
      if (!res.ok) throw new PaypalRequestError("capture", res.status);
      return interpretCapture(orderId, config.merchantId, await readJson(res));
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
