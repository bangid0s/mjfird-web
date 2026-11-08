import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  CheckoutDbError,
  type CheckoutDb,
  type CheckoutRecord,
  type RequestRecord,
} from "@/lib/payments/checkout-db";
import { normalizeUsd } from "@/lib/payments/money";

const requestRow = z.object({
  id: z.uuid(),
  client_id: z.uuid(),
  status: z.string(),
  final_price: z.union([z.string(), z.number(), z.null()]),
  currency: z.string(),
  ref: z.number().int(),
  paid_at: z.string().nullable(),
});

const checkoutRow = z.object({
  request_id: z.uuid(),
  order_id: z.string().min(1),
  capture_id: z.string().nullable(),
  amount: z.union([z.string(), z.number()]),
  currency: z.string(),
  captured_at: z.string().nullable(),
});

const REASONS = [
  "amount_mismatch",
  "not_payable",
  "capture_mismatch",
  "order_not_found",
  "invalid_capture",
  "missing_price",
  "request_not_found",
  "invalid_order",
] as const;

type Reason = (typeof REASONS)[number];

function knownReason(message: string): Reason | null {
  return REASONS.find((code) => message.includes(code)) ?? null;
}

function asUnknown(value: unknown): unknown {
  return value;
}

async function readOne(
  client: SupabaseClient,
  table: "commission_requests" | "commission_paypal_checkouts",
  column: string,
  value: string,
): Promise<unknown> {
  const { data, error } = await client.from(table).select("*").eq(column, value).maybeSingle();
  if (error) throw new CheckoutDbError();
  return asUnknown(data);
}

export function createSupabaseCheckoutDb(clients: { user: SupabaseClient; admin: SupabaseClient }): CheckoutDb {
  return {
    async getRequest(id) {
      const parsed = requestRow.safeParse(await readOne(clients.user, "commission_requests", "id", id));
      if (!parsed.success) return null;
      const row = parsed.data;
      const request: RequestRecord = {
        id: row.id,
        clientId: row.client_id,
        status: row.status,
        finalPrice: row.final_price,
        currency: row.currency,
        ref: row.ref,
        paidAt: row.paid_at,
      };
      return request;
    },

    async getCheckoutByRequest(requestId) {
      return readCheckout(await readOne(clients.admin, "commission_paypal_checkouts", "request_id", requestId));
    },

    async getCheckoutByOrder(orderId) {
      return readCheckout(await readOne(clients.admin, "commission_paypal_checkouts", "order_id", orderId));
    },

    async bindOrder(input) {
      const { data, error } = await clients.admin.rpc("bind_commission_paypal_order", {
        p_request_id: input.requestId,
        p_order_id: input.orderId,
        p_amount: input.amount,
        p_currency: input.currency,
      });
      if (error) {
        const reason = reasonOrThrow(error.message);
        if (reason === "not_payable" || reason === "amount_mismatch" || reason === "missing_price" || reason === "request_not_found" || reason === "invalid_order") {
          return { ok: false, reason };
        }
        return { ok: false, reason: "not_payable" };
      }
      const orderId = z.string().min(1).safeParse(asUnknown(data));
      if (!orderId.success) throw new CheckoutDbError();
      return { ok: true, orderId: orderId.data };
    },

    async completeCapture(input) {
      const { data, error } = await clients.admin.rpc("complete_commission_paypal_capture", {
        p_order_id: input.orderId,
        p_capture_id: input.captureId,
        p_amount: input.amount,
        p_currency: input.currency,
      });
      if (error) {
        const reason = reasonOrThrow(error.message);
        if (
          reason === "order_not_found" ||
          reason === "capture_mismatch" ||
          reason === "not_payable" ||
          reason === "amount_mismatch" ||
          reason === "invalid_capture"
        ) {
          return { ok: false, reason };
        }
        return { ok: false, reason: "not_payable" };
      }
      const result = z.enum(["completed", "duplicate"]).safeParse(asUnknown(data));
      if (!result.success) throw new CheckoutDbError();
      return { ok: true, result: result.data };
    },

  };
}

function readCheckout(value: unknown): CheckoutRecord | null {
  const parsed = checkoutRow.safeParse(value);
  if (!parsed.success || parsed.data.currency !== "USD") return null;
  const amount = normalizeUsd(parsed.data.amount);
  if (!amount) return null;
  return {
    requestId: parsed.data.request_id,
    orderId: parsed.data.order_id,
    captureId: parsed.data.capture_id,
    amount,
    currency: "USD",
    capturedAt: parsed.data.captured_at,
  };
}

function reasonOrThrow(message: string): Reason {
  const reason = knownReason(message);
  if (!reason) throw new CheckoutDbError();
  return reason;
}
