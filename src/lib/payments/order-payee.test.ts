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
  PAYPAL_MERCHANT_ID: "MERCHANT-OURS",
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

function orderShape(merchant: string | null, where: "order" | "capture" | "none") {
  const capture: Record<string, unknown> = {
    id: "CAP-1",
    status: "COMPLETED",
    amount: { currency_code: "USD", value: "80.00" },
  };
  if (where === "capture" && merchant) capture.payee = { merchant_id: merchant };
  const unit: Record<string, unknown> = { payments: { captures: [capture] } };
  if (where === "order" && merchant) unit.payee = { merchant_id: merchant };
  return { id: "ORDER-1", status: "COMPLETED", purchase_units: [unit] };
}

function fetchFor(routes: Record<string, unknown>): typeof fetch {
  return async (input, init) => {
    const url = String(input);
    if (!url.startsWith(PAYPAL_SANDBOX_API)) throw new Error("non-sandbox");
    if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "tok", token_type: "Bearer" });
    if (url.endsWith("/capture")) {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Prefer"), "return=representation");
      return Response.json(routes.capture);
    }
    if (url.endsWith("/v2/checkout/orders/ORDER-1")) return Response.json(routes.order);
    return Response.json({ id: "ORDER-OTHER", status: "COMPLETED" }, { status: 200 });
  };
}

async function paidRow(routes: Record<string, unknown>) {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const result = await captureSandboxOrder(
    { db: db.checkout, paypal: createPaypalSandboxClient(config, fetchFor(routes)), userId: CLIENT_ID },
    { orderId: "ORDER-1" },
  );
  const row = await db.read();
  return { db, result, row };
}

test("order-level payee on a capture response marks the request paid", async () => {
  const run = await paidRow({ capture: orderShape("MERCHANT-OURS", "order") });
  assert.equal(run.result.status, 200);
  assert.equal(run.row.status, "in_progress");
  assert.equal(run.row.captureId, "CAP-1");
  assert.notEqual(run.row.paidAt, null);
  await run.db.pg.close();
});

test("a capture response without a payee uses that order's payee", async () => {
  const run = await paidRow({
    capture: orderShape(null, "none"),
    order: orderShape("MERCHANT-OURS", "order"),
  });
  assert.equal(run.result.status, 200);
  assert.equal(run.row.status, "in_progress");
  assert.equal(run.row.captureId, "CAP-1");
  await run.db.pg.close();

  const foreign = await paidRow({
    capture: orderShape(null, "none"),
    order: { id: "ORDER-OTHER", status: "COMPLETED", purchase_units: [{ payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [] } }] },
  });
  assert.equal(foreign.result.status, 409);
  assert.equal(foreign.row.status, "awaiting_payment");
  assert.equal(foreign.row.paidAt, null);
  await foreign.db.pg.close();
});

test("a different payee is held on capture, retry, and webhook", async () => {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const paypal = createPaypalSandboxClient(config, fetchFor({ capture: orderShape("MERCHANT-OTHER", "order") }));
  const first = await captureSandboxOrder({ db: db.checkout, paypal, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(first.status, 409);
  assert.equal((await db.read()).status, "awaiting_payment");
  assert.equal((await db.read()).captureId, "CAP-1");
  assert.equal((await db.read()).paidAt, null);
  const retry = await captureSandboxOrder({ db: db.checkout, paypal, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(retry.status, 409);
  assert.equal((await db.read()).paidAt, null);
  const webhook = await handleSandboxWebhook(
    { db: db.checkout, paypal: stub, expectedMerchant: "MERCHANT-OURS" },
    {
      headers: new Headers(),
      rawBody: JSON.stringify({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAP-1",
          status: "COMPLETED",
          amount: { currency_code: "USD", value: "80.00" },
          payee: { merchant_id: "MERCHANT-OTHER" },
          supplementary_data: { related_ids: { order_id: "ORDER-1" } },
        },
      }),
    },
  );
  assert.equal("held" in webhook.body && webhook.body.held, true);
  assert.equal((await db.read()).status, "awaiting_payment");
  assert.equal((await db.read()).paidAt, null);
  await db.pg.close();
});

test("a mismatched payee on retry is not paid", async () => {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const responses = [
    {
      id: "ORDER-1",
      status: "PENDING",
      purchase_units: [{ payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [{ id: "CAP-WAIT", status: "PENDING", amount: { currency_code: "USD", value: "80.00" } }] } }],
    },
    orderShape("MERCHANT-OTHER", "capture"),
  ];
  let n = 0;
  const paypal = createPaypalSandboxClient(config, async (input, init) => {
    const url = String(input);
    if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "tok", token_type: "Bearer" });
    if (url.endsWith("/capture")) {
      assert.equal(new Headers(init?.headers).get("Prefer"), "return=representation");
      const body = responses[Math.min(n, responses.length - 1)];
      n += 1;
      return Response.json(body);
    }
    return Response.json({ id: "ORDER-OTHER" });
  });
  const pending = await captureSandboxOrder({ db: db.checkout, paypal, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(pending.status, 502);
  assert.equal((await db.read()).paidAt, null);
  const retry = await captureSandboxOrder({ db: db.checkout, paypal, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(retry.status, 409);
  assert.equal((await db.read()).status, "awaiting_payment");
  assert.equal((await db.read()).paidAt, null);
  assert.equal((await db.read()).captureId, "CAP-WAIT");
  const evidence = await db.pg.query<{ provider_evidence: string | null }>("select provider_evidence from commission_paypal_checkouts where order_id = 'ORDER-1'");
  assert.match(evidence.rows[0]?.provider_evidence ?? "", /MERCHANT-OTHER/);
  await db.pg.close();
});

test("a webhook does not pay when the configured merchant is missing", async () => {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  await captureSandboxOrder(
    { db: db.checkout, paypal: createPaypalSandboxClient(config, fetchFor({ capture: {
      id: "ORDER-1",
      status: "PENDING",
      purchase_units: [{ payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [{ id: "CAP-WAIT", status: "PENDING", amount: { currency_code: "USD", value: "80.00" } }] } }],
    } })), userId: CLIENT_ID },
    { orderId: "ORDER-1" },
  );
  const webhook = await handleSandboxWebhook(
    { db: db.checkout, paypal: stub },
    {
      headers: new Headers(),
      rawBody: JSON.stringify({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAP-WAIT",
          status: "COMPLETED",
          amount: { currency_code: "USD", value: "80.00" },
          payee: { merchant_id: "MERCHANT-OURS" },
          supplementary_data: { related_ids: { order_id: "ORDER-1" } },
        },
      }),
    },
  );
  assert.equal("held" in webhook.body && webhook.body.held, true);
  assert.equal((await db.read()).paidAt, null);
  assert.equal((await db.read()).status, "awaiting_payment");
  await db.pg.close();
});
