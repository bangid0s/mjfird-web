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
  const held = await db.pg.query<{ complete_commission_paypal_capture: string }>(
    "select complete_commission_paypal_capture('ORDER-1', 'CAP-WRONG', '1.00', 'USD')",
  );
  assert.equal(held.rows[0]?.complete_commission_paypal_capture, "held");
  assert.equal((await db.read()).status, "awaiting_payment");
  assert.equal((await db.read()).captureId, "CAP-WRONG");
  assert.equal((await db.read()).paidAt, null);
  await assert.rejects(
    () => db.pg.query("select complete_commission_paypal_capture('ORDER-1', 'CAP-1', '80.00', 'USD')"),
    (err: unknown) => err instanceof Error && err.message.includes("capture_mismatch"),
  );

  await db.pg.query("update commission_paypal_checkouts set capture_id = null, capture_pending = false, capture_disposition = 'open', provider_evidence = null where order_id = 'ORDER-1'");
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

test("direct updates cannot clear a pending capture, and locks take the request first", async () => {
  const db = await createPaypalTestDb();
  await db.seed();
  await db.pg.query("select reserve_commission_paypal_order($1, '80.00', 'USD')", [REQUEST_ID]);
  await db.pg.query("select attach_commission_paypal_order($1, 'ORDER-1', '80.00', 'USD')", [REQUEST_ID]);
  await db.pg.query("select begin_commission_paypal_capture('ORDER-1')");
  await assert.rejects(
    () => db.pg.query("update commission_requests set status = 'cancelled' where id = $1", [REQUEST_ID]),
    (err: unknown) => err instanceof Error && err.message.includes("capture_in_progress"),
  );
  assert.equal((await db.read()).status, "awaiting_payment");
  assert.equal((await db.read()).capturePending, true);

  const defs = await db.pg.query<{ proname: string; def: string }>(
    `select p.proname, pg_get_functiondef(p.oid) as def
     from pg_proc p
     where p.pronamespace = 'public'::regnamespace
       and p.proname in (
         'reserve_commission_paypal_order',
         'attach_commission_paypal_order',
         'begin_commission_paypal_capture',
         'complete_commission_paypal_capture',
         'hold_commission_paypal_capture',
         'mark_commission_paid_manual',
         'admin_cancel_commission_request',
         'cancel_commission_request'
       )`,
  );
  for (const row of defs.rows) {
    const locks = [...row.def.matchAll(/from\s+(commission_requests|commission_paypal_checkouts)[^;]{0,120}?for update/gi)];
    assert.ok(locks.length > 0, row.proname);
    assert.equal(locks[0]?.[1], "commission_requests", row.proname);
  }
});

test("manual payment after a stored capture keeps the capture id", async () => {
  const db = await createPaypalTestDb();
  await db.seed();
  await db.pg.query("select reserve_commission_paypal_order($1, '80.00', 'USD')", [REQUEST_ID]);
  await db.pg.query("select attach_commission_paypal_order($1, 'ORDER-9', '80.00', 'USD')", [REQUEST_ID]);
  await db.pg.query("select complete_commission_paypal_capture('ORDER-9', 'CAP-9', '80.00', 'USD')");
  assert.equal(await db.manualMark(), "blocked");
  const state = await db.read();
  assert.equal(state.status, "in_progress");
  assert.equal(state.captureId, "CAP-9");
});
