import assert from "node:assert/strict";
import test from "node:test";
import { createPaypalTestDb, REQUEST_ID } from "@/lib/payments/paypal-test-db";

test("anon and authenticated cannot execute capture writes", async () => {
  const db = await createPaypalTestDb();
  const anon = await db.pg.query<{ allowed: boolean }>(
    "select has_function_privilege('anon', 'public.complete_commission_paypal_capture(text,text,text,text)', 'execute') as allowed",
  );
  const user = await db.pg.query<{ allowed: boolean }>(
    "select has_function_privilege('authenticated', 'public.begin_commission_paypal_capture(text)', 'execute') as allowed",
  );
  const manual = await db.pg.query<{ allowed: boolean }>(
    "select has_function_privilege('authenticated', 'public.mark_commission_paid_manual(uuid)', 'execute') as allowed",
  );
  const service = await db.pg.query<{ allowed: boolean }>(
    "select has_function_privilege('service_role', 'public.reserve_commission_paypal_order(uuid,text,text)', 'execute') as allowed",
  );
  assert.equal(anon.rows[0]?.allowed, false);
  assert.equal(user.rows[0]?.allowed, false);
  assert.equal(manual.rows[0]?.allowed, true);
  assert.equal(service.rows[0]?.allowed, true);
});

test("a mismatched capture does not change the request, and a second capture id is rejected", async () => {
  const db = await createPaypalTestDb();
  await db.seed();
  await db.pg.query("select reserve_commission_paypal_order($1, '80.00', 'USD')", [REQUEST_ID]);
  await db.pg.query("select attach_commission_paypal_order($1, 'ORDER-1', '80.00', 'USD')", [REQUEST_ID]);
  await assert.rejects(
    () => db.pg.query("select complete_commission_paypal_capture('ORDER-1', 'CAP-1', '1.00', 'USD')"),
    (err: unknown) => err instanceof Error && err.message.includes("amount_mismatch"),
  );
  assert.equal((await db.read()).status, "awaiting_payment");
  assert.equal((await db.read()).captureId, null);

  await db.pg.query("select begin_commission_paypal_capture('ORDER-1')");
  const completed = await db.pg.query<{ complete_commission_paypal_capture: string }>(
    "select complete_commission_paypal_capture('ORDER-1', 'CAP-1', '80.00', 'USD')",
  );
  assert.equal(completed.rows[0]?.complete_commission_paypal_capture, "completed");
  const paidAt = (await db.read()).paidAt;
  const duplicate = await db.pg.query<{ complete_commission_paypal_capture: string }>(
    "select complete_commission_paypal_capture('ORDER-1', 'CAP-1', '80.00', 'USD')",
  );
  assert.equal(duplicate.rows[0]?.complete_commission_paypal_capture, "duplicate");
  assert.equal((await db.read()).paidAt, paidAt);
  await assert.rejects(
    () => db.pg.query("select complete_commission_paypal_capture('ORDER-1', 'CAP-2', '80.00', 'USD')"),
    (err: unknown) => err instanceof Error && err.message.includes("capture_mismatch"),
  );
});

test("manual payment after a stored capture keeps the capture id", async () => {
  const db = await createPaypalTestDb();
  await db.seed();
  await db.pg.query("select reserve_commission_paypal_order($1, '80.00', 'USD')", [REQUEST_ID]);
  await db.pg.query("select attach_commission_paypal_order($1, 'ORDER-9', '80.00', 'USD')", [REQUEST_ID]);
  await db.pg.query("select complete_commission_paypal_capture('ORDER-9', 'CAP-9', '80.00', 'USD')");
  assert.equal(await db.manualMark(), "conflict");
  const state = await db.read();
  assert.equal(state.status, "in_progress");
  assert.equal(state.captureId, "CAP-9");
});
