import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  CheckoutDbError,
  type AttachResult,
  type BeginCaptureResult,
  type CheckoutDb,
  type CheckoutFailure,
  type ReserveResult,
} from "@/lib/payments/checkout-db";

const migration = readFileSync(new URL("../../../supabase/migrations/0030_paypal_sandbox_checkout.sql", import.meta.url), "utf8");

const REASONS = [
  "amount_mismatch",
  "not_payable",
  "capture_mismatch",
  "order_not_found",
  "invalid_capture",
  "missing_price",
  "request_not_found",
  "invalid_order",
  "capture_recorded",
  "capture_in_progress",
  "not_admin",
  "cannot_cancel",
] as const;

export const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
export const REQUEST_ID = "11111111-1111-4111-8111-111111111111";

class SqlReason extends Error {
  readonly reason: (typeof REASONS)[number];
  constructor(reason: (typeof REASONS)[number]) {
    super(reason);
    this.reason = reason;
  }
}

export type PaymentState = {
  status: string;
  paidAt: string | null;
  orderId: string | null;
  captureId: string | null;
  capturePending: boolean;
};

export async function createPaypalTestDb() {
  const pg = new PGlite();
  await pg.exec(`
    create type commission_status as enum (
      'pending', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'declined', 'cancelled'
    );
    create table commission_requests (
      id uuid primary key,
      client_id uuid,
      service_id uuid,
      status commission_status not null,
      final_price numeric(10, 2),
      currency text not null default 'USD',
      paid_at timestamptz
    );
    create table services (
      id uuid primary key,
      slots_taken int not null default 0
    );
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid language sql stable as $$
      select '${CLIENT_ID}'::uuid
    $$;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  await pg.exec(migration);
  await pg.exec(`create or replace function public.is_admin() returns boolean language sql stable as $$ select true $$;`);

  let failCompletes = 0;

  async function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
    try {
      return await pg.query<T>(sql, params);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const reason = REASONS.find((code) => message.includes(code));
      if (reason) throw new SqlReason(reason);
      throw err;
    }
  }

  function failure(err: unknown): CheckoutFailure | null {
    if (!(err instanceof SqlReason)) return null;
    if (err.reason === "capture_recorded" || err.reason === "capture_in_progress" || err.reason === "not_admin" || err.reason === "cannot_cancel") return "not_payable";
    return err.reason;
  }

  const checkout: CheckoutDb = {
    async getRequest(id) {
      const result = await query<{
        id: string;
        client_id: string;
        status: string;
        final_price: string | null;
        currency: string;
        paid_at: string | null;
      }>("select id, client_id, status, final_price::text, currency, paid_at::text from commission_requests where id = $1", [id]);
      const row = result.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        clientId: row.client_id,
        status: row.status,
        finalPrice: row.final_price,
        currency: row.currency,
        ref: 1001,
        paidAt: row.paid_at,
      };
    },
    async getCheckoutByRequest(requestId) {
      return readCheckout(await query("select * from commission_paypal_checkouts where request_id = $1", [requestId]));
    },
    async getCheckoutByOrder(orderId) {
      return readCheckout(await query("select * from commission_paypal_checkouts where order_id = $1", [orderId]));
    },
    async reserveOrder(input): Promise<ReserveResult> {
      try {
        const result = await query<{ reserve_commission_paypal_order: string }>(
          "select reserve_commission_paypal_order($1, $2, $3)",
          [input.requestId, input.amount, input.currency],
        );
        const value = result.rows[0]?.reserve_commission_paypal_order;
        if (value === "create") return { ok: true, orderId: null };
        if (value?.startsWith("reuse:")) return { ok: true, orderId: value.slice("reuse:".length) };
        throw new CheckoutDbError();
      } catch (err) {
        const reason = failure(err);
        if (!reason) throw err;
        return { ok: false, reason };
      }
    },
    async attachOrder(input): Promise<AttachResult> {
      try {
        const result = await query<{ attach_commission_paypal_order: string }>(
          "select attach_commission_paypal_order($1, $2, $3, $4)",
          [input.requestId, input.orderId, input.amount, input.currency],
        );
        const orderId = result.rows[0]?.attach_commission_paypal_order;
        if (!orderId) throw new CheckoutDbError();
        return { ok: true, orderId };
      } catch (err) {
        const reason = failure(err);
        if (!reason) throw err;
        return { ok: false, reason };
      }
    },
    async beginCapture(orderId): Promise<BeginCaptureResult> {
      try {
        const result = await query<{ begin_commission_paypal_capture: string }>(
          "select begin_commission_paypal_capture($1)",
          [orderId],
        );
        const state = result.rows[0]?.begin_commission_paypal_capture;
        if (state === "ready" || state === "pending" || state === "done") return { ok: true, state };
        throw new CheckoutDbError();
      } catch (err) {
        const reason = failure(err);
        if (reason === "order_not_found" || reason === "not_payable") return { ok: false, reason };
        if (reason) return { ok: false, reason: "not_payable" };
        throw err;
      }
    },
    async releaseCapture(orderId) {
      await query("select release_commission_paypal_capture($1)", [orderId]);
    },
    async holdCapture(input) {
      await query("select hold_commission_paypal_capture($1, $2, $3)", [input.orderId, input.captureId ?? "", input.evidence]);
    },
    async completeCapture(input) {
      if (failCompletes > 0) {
        failCompletes -= 1;
        throw new CheckoutDbError();
      }
      try {
        const result = await query<{ complete_commission_paypal_capture: string }>(
          "select complete_commission_paypal_capture($1, $2, $3, $4)",
          [input.orderId, input.captureId, input.amount, input.currency],
        );
        const value = result.rows[0]?.complete_commission_paypal_capture;
        if (value === "completed" || value === "duplicate" || value === "held") return { ok: true, result: value };
        throw new CheckoutDbError();
      } catch (err) {
        const reason = failure(err);
        if (!reason) throw err;
        return { ok: false, reason };
      }
    },
  };

  return {
    pg,
    checkout,
    failNextComplete() {
      failCompletes += 1;
    },
    async seed(price = "80.00", status = "awaiting_payment") {
      await pg.query(
        "insert into commission_requests (id, client_id, status, final_price, currency) values ($1, $2, $3, $4, 'USD')",
        [REQUEST_ID, CLIENT_ID, status, price],
      );
    },
    async manualMark(requestId = REQUEST_ID) {
      try {
        await query("select mark_commission_paid_manual($1)", [requestId]);
        return "advanced" as const;
      } catch (err) {
        if (err instanceof SqlReason && (err.reason === "capture_in_progress" || err.reason === "capture_recorded")) return "blocked" as const;
        if (err instanceof SqlReason && err.reason === "not_payable") return "conflict" as const;
        throw err;
      }
    },
    async cancelClient(requestId = REQUEST_ID) {
      try {
        await query("select cancel_commission_request($1)", [requestId]);
        return "cancelled" as const;
      } catch (err) {
        if (err instanceof SqlReason && err.reason === "capture_in_progress") return "blocked" as const;
        throw err;
      }
    },
    async read(requestId = REQUEST_ID): Promise<PaymentState> {
      const result = await pg.query<{
        status: string;
        paid_at: string | null;
        order_id: string | null;
        capture_id: string | null;
        capture_pending: boolean | null;
      }>(
        `select r.status, r.paid_at::text as paid_at, c.order_id, c.capture_id, c.capture_pending
         from commission_requests r
         left join commission_paypal_checkouts c on c.request_id = r.id
         where r.id = $1`,
        [requestId],
      );
      const row = result.rows[0];
      if (!row) throw new Error("missing request");
      return {
        status: row.status,
        paidAt: row.paid_at,
        orderId: row.order_id,
        captureId: row.capture_id,
        capturePending: row.capture_pending === true,
      };
    },
  };
}

async function readCheckout(result: { rows: Record<string, unknown>[] }) {
  const row = result.rows[0];
  if (!row) return null;
  const amount = typeof row.amount === "string" || typeof row.amount === "number" ? String(row.amount) : null;
  if (!amount || row.currency !== "USD" || typeof row.request_id !== "string") return null;
  const cents = Number(amount).toFixed(2);
  return {
    requestId: row.request_id,
    orderId: typeof row.order_id === "string" ? row.order_id : null,
    captureId: typeof row.capture_id === "string" ? row.capture_id : null,
    capturePending: row.capture_pending === true,
    amount: cents,
    currency: "USD" as const,
    capturedAt: typeof row.captured_at === "string" ? row.captured_at : null,
  };
}
