import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../../supabase/migrations/0030_paypal_sandbox_checkout.sql", import.meta.url), "utf8");
const requestId = "11111111-1111-4111-8111-111111111111";

async function database() {
  const db = new PGlite();
  await db.exec(`
    create type commission_status as enum (
      'pending', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'declined', 'cancelled'
    );
    create table commission_requests (
      id uuid primary key,
      status commission_status not null,
      final_price numeric(10, 2),
      currency text not null default 'USD',
      paid_at timestamptz
    );
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    grant usage on schema public to anon, authenticated, service_role;
  `);
  await db.exec(migration);
  return db;
}

async function seed(db: PGlite, price = "80.00", status = "awaiting_payment") {
  await db.query("insert into commission_requests (id, status, final_price, currency) values ($1, $2, $3, 'USD')", [
    requestId,
    status,
    price,
  ]);
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "";
}

test("migration functions enforce amount, state, and a single capture", async () => {
  const db = await database();
  await seed(db);
  const bound = await db.query<{ bind_commission_paypal_order: string }>(
    "select bind_commission_paypal_order($1, 'ORDER-1', '80.00', 'USD')",
    [requestId],
  );
  assert.equal(bound.rows[0]?.bind_commission_paypal_order, "ORDER-1");

  await assert.rejects(
    () => db.query("select complete_commission_paypal_capture('ORDER-1', 'CAP-1', '1.00', 'USD')"),
    (err: unknown) => message(err).includes("amount_mismatch"),
  );
  const stillWaiting = await db.query<{ status: string; paid_at: string | null }>(
    "select status, paid_at from commission_requests where id = $1",
    [requestId],
  );
  assert.equal(stillWaiting.rows[0]?.status, "awaiting_payment");
  assert.equal(stillWaiting.rows[0]?.paid_at, null);

  const completed = await db.query<{ complete_commission_paypal_capture: string }>(
    "select complete_commission_paypal_capture('ORDER-1', 'CAP-1', '80.00', 'USD')",
  );
  assert.equal(completed.rows[0]?.complete_commission_paypal_capture, "completed");
  const paid = await db.query<{ status: string; paid_at: string | null }>(
    "select status, paid_at::text as paid_at from commission_requests where id = $1",
    [requestId],
  );
  assert.equal(paid.rows[0]?.status, "in_progress");
  const paidAt = paid.rows[0]?.paid_at;
  assert.ok(paidAt);

  const duplicate = await db.query<{ complete_commission_paypal_capture: string }>(
    "select complete_commission_paypal_capture('ORDER-1', 'CAP-1', '80.00', 'USD')",
  );
  assert.equal(duplicate.rows[0]?.complete_commission_paypal_capture, "duplicate");
  const samePaid = await db.query<{ paid_at: string }>(
    "select paid_at::text as paid_at from commission_requests where id = $1",
    [requestId],
  );
  assert.equal(samePaid.rows[0]?.paid_at, paidAt);

  await assert.rejects(
    () => db.query("select complete_commission_paypal_capture('ORDER-1', 'CAP-2', '80.00', 'USD')"),
    (err: unknown) => message(err).includes("capture_mismatch"),
  );
});

test("a manual status change blocks a later capture", async () => {
  const db = await database();
  await seed(db);
  await db.query("select bind_commission_paypal_order($1, 'ORDER-2', '80.00', 'USD')", [requestId]);
  await db.query(
    "update commission_requests set status = 'in_progress', paid_at = now() where id = $1 and status = 'awaiting_payment'",
    [requestId],
  );
  await assert.rejects(
    () => db.query("select complete_commission_paypal_capture('ORDER-2', 'CAP-9', '80.00', 'USD')"),
    (err: unknown) => message(err).includes("not_payable"),
  );
  const capture = await db.query<{ capture_id: string | null }>(
    "select capture_id from commission_paypal_checkouts where order_id = 'ORDER-2'",
  );
  assert.equal(capture.rows[0]?.capture_id, null);
});

test("anon and authenticated cannot execute the payment functions", async () => {
  const db = await database();
  const anon = await db.query<{ allowed: boolean }>(
    "select has_function_privilege('anon', 'public.complete_commission_paypal_capture(text,text,text,text)', 'execute') as allowed",
  );
  const user = await db.query<{ allowed: boolean }>(
    "select has_function_privilege('authenticated', 'public.bind_commission_paypal_order(uuid,text,text,text)', 'execute') as allowed",
  );
  const service = await db.query<{ allowed: boolean }>(
    "select has_function_privilege('service_role', 'public.complete_commission_paypal_capture(text,text,text,text)', 'execute') as allowed",
  );
  assert.equal(anon.rows[0]?.allowed, false);
  assert.equal(user.rows[0]?.allowed, false);
  assert.equal(service.rows[0]?.allowed, true);
});
