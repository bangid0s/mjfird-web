import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  CheckoutDbError,
  type AttachResult,
  type BeginCaptureResult,
  type CheckoutDb,
  type CheckoutFailure,
  type CheckoutRecord,
  type RequestRecord,
  type ReserveResult,
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
  order_id: z.string().min(1).nullable(),
  capture_id: z.string().nullable(),
  capture_pending: z.boolean(),
  capture_disposition: z.enum(["open", "uncertain", "held", "matched"]),
  expected_merchant: z.string().nullable(),
  merchant_proven: z.boolean(),
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

    async reserveOrder(input): Promise<ReserveResult> {
      try {
        const data = await rpc(clients.admin, "reserve_commission_paypal_order", {
          p_request_id: input.requestId,
          p_amount: input.amount,
          p_currency: input.currency,
        });
        return parseReserve(data);
      } catch (err) {
        const reason = failureReason(err);
        if (!reason) throw err;
        return { ok: false, reason };
      }
    },

    async attachOrder(input): Promise<AttachResult> {
      try {
        const data = await rpc(clients.admin, "attach_commission_paypal_order", {
          p_request_id: input.requestId,
          p_order_id: input.orderId,
          p_amount: input.amount,
          p_currency: input.currency,
        });
        const orderId = z.string().min(1).safeParse(data);
        if (!orderId.success) throw new CheckoutDbError();
        return { ok: true, orderId: orderId.data };
      } catch (err) {
        const reason = failureReason(err);
        if (!reason) throw err;
        return { ok: false, reason };
      }
    },

    async beginCapture(orderId): Promise<BeginCaptureResult> {
      try {
        const data = await rpc(clients.admin, "begin_commission_paypal_capture", { p_order_id: orderId });
        const state = z.enum(["ready", "pending", "done"]).safeParse(data);
        if (!state.success) throw new CheckoutDbError();
        return { ok: true, state: state.data };
      } catch (err) {
        const reason = failureReason(err);
        if (reason === "order_not_found" || reason === "not_payable") return { ok: false, reason };
        if (reason) return { ok: false, reason: "not_payable" };
        throw err;
      }
    },

    async releaseCapture(orderId) {
      await rpc(clients.admin, "release_commission_paypal_capture", { p_order_id: orderId });
    },

    async noteExpectedMerchant(orderId, merchantId) {
      await rpc(clients.admin, "note_commission_paypal_merchant", { p_order_id: orderId, p_merchant: merchantId });
    },

    async proveMerchant(orderId, merchantId) {
      const data = await rpc(clients.admin, "prove_commission_paypal_merchant", { p_order_id: orderId, p_merchant: merchantId });
      const proof = z.enum(["proven", "rejected", "unconfigured"]).safeParse(data);
      if (!proof.success) throw new CheckoutDbError();
      return proof.data;
    },

    async holdCapture(input) {
      await rpc(clients.admin, "hold_commission_paypal_capture", {
        p_order_id: input.orderId,
        p_capture_id: input.captureId ?? "",
        p_evidence: input.evidence,
        p_kind: input.kind,
      });
    },

    async completeCapture(input) {
      try {
        const data = await rpc(clients.admin, "complete_commission_paypal_capture", {
          p_order_id: input.orderId,
          p_capture_id: input.captureId,
          p_amount: input.amount,
          p_currency: input.currency,
        });
        const result = z.enum(["completed", "duplicate", "held"]).safeParse(data);
        if (!result.success) throw new CheckoutDbError();
        return { ok: true, result: result.data };
      } catch (err) {
        const reason = failureReason(err);
        if (!reason) throw err;
        return { ok: false, reason };
      }
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
    capturePending: parsed.data.capture_pending,
    disposition: parsed.data.capture_disposition,
    expectedMerchant: parsed.data.expected_merchant,
    merchantProven: parsed.data.merchant_proven,
    amount,
    currency: "USD",
    capturedAt: parsed.data.captured_at,
  };
}

async function rpc(client: SupabaseClient, fn: string, args: Record<string, string>): Promise<unknown> {
  const { data, error } = await client.rpc(fn, args);
  if (error) {
    const reason = knownReason(error.message);
    if (reason) throw new CheckoutFailureError(reason);
    throw new CheckoutDbError();
  }
  return asUnknown(data);
}

class CheckoutFailureError extends Error {
  readonly reason: CheckoutFailure;
  constructor(reason: CheckoutFailure) {
    super(reason);
    this.name = "CheckoutFailureError";
    this.reason = reason;
  }
}

function parseReserve(data: unknown): ReserveResult {
  const text = z.string().safeParse(data);
  if (!text.success) throw new CheckoutDbError();
  if (text.data === "create") return { ok: true, orderId: null };
  if (text.data.startsWith("reuse:")) return { ok: true, orderId: text.data.slice("reuse:".length) };
  throw new CheckoutDbError();
}

function failureReason(err: unknown): CheckoutFailure | null {
  return err instanceof CheckoutFailureError ? err.reason : null;
}
