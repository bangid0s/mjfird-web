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

export type CapturedPayment = {
  captureId: string;
  status: "COMPLETED";
  amount: string;
  currency: "USD";
};

export type PaypalClient = {
  createOrder(amount: string, requestId: string, ref: number, idempotencyKey: string): Promise<{ id: string }>;
  captureOrder(orderId: string, idempotencyKey: string): Promise<CapturedPayment | { status: "not_completed" }>;
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
  amount: z.object({
    currency_code: z.string(),
    value: z.string(),
  }),
});

const capturedOrderSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
  purchase_units: z.array(
    z.object({
      payments: z
        .object({
          captures: z.array(captureSchema),
        })
        .optional(),
    }),
  ),
});

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
      const parsed = capturedOrderSchema.safeParse(await readJson(res));
      if (!parsed.success || parsed.data.status !== "COMPLETED") return { status: "not_completed" };
      const captures = parsed.data.purchase_units.flatMap((unit) => unit.payments?.captures ?? []);
      const completed = captures.filter((capture) => capture.status === "COMPLETED");
      if (completed.length !== 1) return { status: "not_completed" };
      const capture = completed[0];
      if (!capture) return { status: "not_completed" };
      const amount = normalizeUsd(capture.amount.value);
      if (!amount || capture.amount.currency_code !== "USD") return { status: "not_completed" };
      return { captureId: capture.id, status: "COMPLETED", amount, currency: "USD" };
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
