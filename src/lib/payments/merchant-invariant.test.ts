/**
 * Premise this file disproves:
 * Merchant validation only on a single COMPLETED capture, plus held vs uncertain,
 * is enough. It is not. Pending, unknown, and no-capture results are also merchant
 * evidence, and a later webhook is a second consumer. When PAYPAL_MERCHANT_ID is
 * set, a missing, malformed, or different payee is not a validated merchant.
 * Amount agreement does not promote those rows. With the merchant unset, this
 * file does not treat a fixture payee as a diversion.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { captureSandboxOrder, createSandboxOrder, handleSandboxWebhook } from "@/lib/payments/checkout";
import { PAYPAL_SANDBOX_API, readPaypalSandboxConfig } from "@/lib/payments/config";
import { createPaypalSandboxClient, type PaypalClient } from "@/lib/payments/paypal-client";
import { CLIENT_ID, REQUEST_ID, createPaypalTestDb } from "@/lib/payments/paypal-test-db";

const config = readPaypalSandboxConfig({
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: "fake-sandbox-client",
  PAYPAL_CLIENT_SECRET: "fake-sandbox-secret",
  PAYPAL_WEBHOOK_ID: "WH-fake",
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: "fake-public-client",
  SUPABASE_SERVICE_ROLE_KEY: "fake-service-role",
  NEXT_PUBLIC_SUPABASE_URL: "https://isolated.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon",
  PAYPAL_MERCHANT_ID: "OUR-MERCHANT",
});

const stub: PaypalClient = {
  async createOrder() {
    return { id: "ORDER-1" };
  },
  async captureOrder() {
    return { outcome: "uncertain", evidence: "unused", captureId: null };
  },
  async verifyWebhook() {
    return true;
  },
};

function fetchFor(body: unknown): typeof fetch {
  return async (input) => {
    const url = String(input);
    if (!url.startsWith(PAYPAL_SANDBOX_API)) throw new Error("non-sandbox");
    if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "tok", token_type: "Bearer" });
    return Response.json(body);
  };
}

async function ordered() {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  return db;
}

async function stored(db: Awaited<ReturnType<typeof ordered>>) {
  const result = await db.pg.query<{
    status: string;
    paid_at: string | null;
    capture_id: string | null;
    capture_disposition: string;
    provider_evidence: string | null;
  }>(
    `select r.status::text as status, r.paid_at::text as paid_at, c.capture_id, c.capture_disposition, c.provider_evidence
     from commission_requests r join commission_paypal_checkouts c on c.request_id = r.id`,
  );
  const row = result.rows[0];
  if (!row) throw new Error("missing checkout");
  return row;
}

async function capture(body: unknown) {
  assert.ok(config);
  const db = await ordered();
  const result = await captureSandboxOrder(
    { db: db.checkout, paypal: createPaypalSandboxClient(config, fetchFor(body)), userId: CLIENT_ID },
    { orderId: "ORDER-1" },
  );
  return { db, result, row: await stored(db) };
}

function order(captures: unknown[], status = "COMPLETED") {
  return { id: "ORDER-1", status, purchase_units: [{ payments: { captures } }] };
}

async function webhook(db: Awaited<ReturnType<typeof ordered>>, captureId: string, payee: unknown) {
  assert.ok(config);
  return handleSandboxWebhook(
    { db: db.checkout, paypal: stub, expectedMerchant: config.merchantId },
    {
      headers: new Headers(),
      rawBody: JSON.stringify({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: captureId,
          status: "COMPLETED",
          amount: { currency_code: "USD", value: "80.00" },
          ...(payee === undefined ? {} : { payee }),
          supplementary_data: { related_ids: { order_id: "ORDER-1" } },
        },
      }),
    },
  );
}

test("configured merchant is required on pending, unparsed, and webhook evidence", async () => {
  const healthy = await capture(order([{ id: "CAP-OK", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" }, payee: { merchant_id: "OUR-MERCHANT" } }]));
  assert.equal(healthy.result.status, 200);
  assert.equal(healthy.row.status, "in_progress");
  await healthy.db.pg.close();

  const pendingForeign = await capture(order([{ id: "CAP-PEND", status: "PENDING", amount: { currency_code: "USD", value: "80.00" }, payee: { merchant_id: "NOT-OURS" } }], "PENDING"));
  assert.notEqual(pendingForeign.row.status, "in_progress");
  assert.match(pendingForeign.row.provider_evidence ?? "", /NOT-OURS/);
  assert.match(pendingForeign.row.provider_evidence ?? "", /CAP-PEND/);
  const pendingWebhook = await webhook(pendingForeign.db, "CAP-PEND", { merchant_id: "NOT-OURS" });
  assert.equal("held" in pendingWebhook.body && pendingWebhook.body.held, true);
  assert.equal((await stored(pendingForeign.db)).paid_at, null);
  await pendingForeign.db.pg.close();

  const unparsed = await capture({ id: "ORDER-1", status: "COMPLETED" });
  assert.equal(unparsed.row.capture_disposition, "uncertain");
  const foreignWebhook = await webhook(unparsed.db, "CAP-LATER", { merchant_id: "NOT-OURS" });
  assert.equal("held" in foreignWebhook.body && foreignWebhook.body.held, true);
  const afterForeign = await stored(unparsed.db);
  assert.equal(afterForeign.paid_at, null);
  assert.match(afterForeign.provider_evidence ?? "", /no-captures/);
  assert.match(afterForeign.provider_evidence ?? "", /NOT-OURS/);
  await unparsed.db.pg.close();

  const pendingOurs = await capture(order([{ id: "CAP-PEND", status: "PENDING", amount: { currency_code: "USD", value: "80.00" }, payee: { merchant_id: "OUR-MERCHANT" } }], "PENDING"));
  assert.equal(pendingOurs.row.capture_disposition, "uncertain");
  assert.match(pendingOurs.row.provider_evidence ?? "", /OUR-MERCHANT/);
  const missingWebhook = await webhook(pendingOurs.db, "CAP-PEND", undefined);
  assert.equal("ok" in missingWebhook.body, false);
  assert.equal((await stored(pendingOurs.db)).paid_at, null);
  const malformedWebhook = await webhook(pendingOurs.db, "CAP-PEND", { merchant_id: 12 });
  assert.equal("ok" in malformedWebhook.body, false);
  assert.equal((await stored(pendingOurs.db)).paid_at, null);
  await pendingOurs.db.pg.close();

  const reconciled = await capture(order([{ id: "CAP-PEND", status: "PENDING", amount: { currency_code: "USD", value: "80.00" }, payee: { merchant_id: "OUR-MERCHANT" } }], "PENDING"));
  const matched = await webhook(reconciled.db, "CAP-PEND", { merchant_id: "OUR-MERCHANT" });
  assert.equal(matched.status, 200);
  assert.equal("ok" in matched.body && matched.body.ok, true);
  assert.notEqual((await stored(reconciled.db)).paid_at, null);
  await reconciled.db.pg.close();
});
