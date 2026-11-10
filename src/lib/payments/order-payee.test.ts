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
  async confirmOrderPayee() {
    return { ok: false, evidence: "unused" };
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

async function detail(db: { pg: { query: <T extends Record<string, unknown>>(sql: string) => Promise<{ rows: T[] }> } }) {
  const result = await db.pg.query<{
    capture_disposition: string;
    merchant_proven: boolean;
    capture_id: string | null;
    status: string;
    paid_at: string | null;
  }>(
    `select c.capture_disposition, c.merchant_proven, c.capture_id, r.status::text as status, r.paid_at::text as paid_at
     from commission_requests r join commission_paypal_checkouts c on c.request_id = r.id`,
  );
  const row = result.rows[0];
  if (!row) throw new Error("missing checkout");
  return row;
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
  const stored = await detail(run.db);
  assert.equal(stored.capture_disposition, "matched");
  assert.equal(stored.merchant_proven, true);
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
  const stored = await detail(run.db);
  assert.equal(stored.capture_disposition, "matched");
  assert.equal(stored.merchant_proven, true);
  await run.db.pg.close();

  const foreign = await paidRow({
    capture: orderShape(null, "none"),
    order: { id: "ORDER-OTHER", status: "COMPLETED", purchase_units: [{ payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [] } }] },
  });
  assert.equal(foreign.result.status, 409);
  assert.equal(foreign.row.status, "awaiting_payment");
  assert.equal(foreign.row.paidAt, null);
  const storedForeign = await detail(foreign.db);
  assert.equal(storedForeign.capture_disposition, "held");
  assert.equal(storedForeign.merchant_proven, false);
  assert.equal(storedForeign.capture_id, "CAP-1");
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
  const stored = await detail(db);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-1");
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
  const retryRow = await detail(db);
  assert.equal(retryRow.capture_disposition, "held");
  assert.equal(retryRow.merchant_proven, false);
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
  const stored = await detail(db);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-WAIT");
  await db.pg.close();
});

test("a blank merchant id does not mark a capture paid", async () => {
  const blank = readPaypalSandboxConfig({
    PAYPAL_ENV: "sandbox",
    PAYPAL_CLIENT_ID: "fake-sandbox-client",
    PAYPAL_CLIENT_SECRET: "fake-sandbox-secret",
    PAYPAL_WEBHOOK_ID: "WH-fake",
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: "fake-public-client",
    SUPABASE_SERVICE_ROLE_KEY: "fake-service-role",
    NEXT_PUBLIC_SUPABASE_URL: "https://isolated.invalid",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon",
    PAYPAL_MERCHANT_ID: "   ",
  });
  assert.ok(blank);
  assert.equal(blank.merchantId, null);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const result = await captureSandboxOrder(
    { db: db.checkout, paypal: createPaypalSandboxClient(blank, fetchFor({ capture: orderShape("MERCHANT-OURS", "order") })), userId: CLIENT_ID },
    { orderId: "ORDER-1" },
  );
  assert.equal(result.status, 409);
  const stored = await detail(db);
  assert.equal(stored.status, "awaiting_payment");
  assert.equal(stored.paid_at, null);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-1");
  await db.pg.close();
});

test("a capture resource is held and is not replaced by an order read", async () => {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const result = await captureSandboxOrder(
    {
      db: db.checkout,
      paypal: createPaypalSandboxClient(config, fetchFor({
        capture: { id: "CAP-POST", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" } },
        order: orderShape("MERCHANT-OURS", "order"),
      })),
      userId: CLIENT_ID,
    },
    { orderId: "ORDER-1" },
  );
  assert.equal(result.status, 409);
  const stored = await detail(db);
  assert.equal(stored.paid_at, null);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-POST");
  await db.pg.close();
});

function lookupClient(orderResponse: unknown | "throw" | "http", captureBody: unknown = orderShape(null, "none")) {
  assert.ok(config);
  return createPaypalSandboxClient(config, async (input, init) => {
    const url = String(input);
    if (!url.startsWith(PAYPAL_SANDBOX_API)) throw new Error("non-sandbox");
    if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "tok", token_type: "Bearer" });
    if (url.endsWith("/capture")) {
      assert.equal(new Headers(init?.headers).get("Prefer"), "return=representation");
      return Response.json(captureBody);
    }
    if (orderResponse === "throw") throw new Error("timeout");
    if (orderResponse === "http") return Response.json({ message: "unavailable" }, { status: 503 });
    return Response.json(orderResponse);
  });
}

async function heldLookup(orderResponse: unknown | "throw" | "http") {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const result = await captureSandboxOrder(
    { db: db.checkout, paypal: lookupClient(orderResponse), userId: CLIENT_ID },
    { orderId: "ORDER-1" },
  );
  const stored = await detail(db);
  assert.equal(stored.status, "awaiting_payment");
  assert.equal(stored.paid_at, null);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-1");
  return { db, result };
}

test("an order read HTTP error leaves the posted capture held", async () => {
  const run = await heldLookup("http");
  assert.equal(run.result.status, 502);
  await run.db.pg.close();
});

test("an order read that throws leaves the posted capture held", async () => {
  const run = await heldLookup("throw");
  assert.equal(run.result.status, 502);
  const declined = await captureSandboxOrder(
    { db: run.db.checkout, paypal: lookupClient(orderShape("MERCHANT-OURS", "order"), { id: "ORDER-1", status: "DECLINED", purchase_units: [{ payments: { captures: [{ id: "CAP-NO", status: "DECLINED", amount: { currency_code: "USD", value: "80.00" }, payee: { merchant_id: "MERCHANT-OURS" } }] } }] }), userId: CLIENT_ID },
    { orderId: "ORDER-1" },
  );
  assert.equal(declined.status, 409);
  const stored = await detail(run.db);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.capture_id, "CAP-1");
  assert.equal(stored.paid_at, null);
  assert.equal(await run.db.manualMark(), "blocked");
  await run.db.pg.close();
});

test("an order read with a different capture id is held", async () => {
  const swapped = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [{ payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [{ id: "CAP-OTHER", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" } }] } }],
  };
  const run = await heldLookup(swapped);
  assert.equal(run.result.status, 409);
  await run.db.pg.close();
});

test("an order read does not supply a capture the post omitted", async () => {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const result = await captureSandboxOrder(
    {
      db: db.checkout,
      paypal: createPaypalSandboxClient(config, fetchFor({
        capture: { id: "ORDER-1", status: "COMPLETED", purchase_units: [] },
        order: orderShape("MERCHANT-OURS", "order"),
      })),
      userId: CLIENT_ID,
    },
    { orderId: "ORDER-1" },
  );
  assert.notEqual(result.status, 200);
  const stored = await detail(db);
  assert.equal(stored.paid_at, null);
  assert.equal(stored.capture_id, null);
  assert.notEqual(stored.capture_disposition, "matched");
  await db.pg.close();
});

test("an order read with a different amount is held", async () => {
  const mismatched = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [{ payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "1.00" } }] } }],
  };
  const run = await heldLookup(mismatched);
  assert.equal(run.result.status, 409);
  await run.db.pg.close();
});

test("a missing payee stays held on retry", async () => {
  assert.ok(config);
  const bare = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [{ payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" } }] } }],
  };
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const paypal = createPaypalSandboxClient(config, fetchFor({ capture: bare, order: bare }));
  const first = await captureSandboxOrder({ db: db.checkout, paypal, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(first.status, 409);
  const retry = await captureSandboxOrder({ db: db.checkout, paypal, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(retry.status, 409);
  const stored = await detail(db);
  assert.equal(stored.status, "awaiting_payment");
  assert.equal(stored.paid_at, null);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-1");
  await db.pg.close();
});

test("a blank merchant id stays held on retry and webhook", async () => {
  const blank = readPaypalSandboxConfig({
    PAYPAL_ENV: "sandbox",
    PAYPAL_CLIENT_ID: "fake-sandbox-client",
    PAYPAL_CLIENT_SECRET: "fake-sandbox-secret",
    PAYPAL_WEBHOOK_ID: "WH-fake",
    NEXT_PUBLIC_PAYPAL_CLIENT_ID: "fake-public-client",
    SUPABASE_SERVICE_ROLE_KEY: "fake-service-role",
    NEXT_PUBLIC_SUPABASE_URL: "https://isolated.invalid",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon",
    PAYPAL_MERCHANT_ID: "",
  });
  assert.ok(blank);
  assert.equal(blank.merchantId, null);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const paypal = createPaypalSandboxClient(blank, fetchFor({ capture: orderShape("MERCHANT-OURS", "order") }));
  const first = await captureSandboxOrder({ db: db.checkout, paypal, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(first.status, 409);
  const retry = await captureSandboxOrder({ db: db.checkout, paypal, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(retry.status, 409);
  const webhook = await handleSandboxWebhook(
    { db: db.checkout, paypal: stub, expectedMerchant: "   " },
    {
      headers: new Headers(),
      rawBody: JSON.stringify({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAP-1",
          status: "COMPLETED",
          amount: { currency_code: "USD", value: "80.00" },
          payee: { merchant_id: "MERCHANT-OURS" },
          supplementary_data: { related_ids: { order_id: "ORDER-1" } },
        },
      }),
    },
  );
  assert.equal("held" in webhook.body && webhook.body.held, true);
  const stored = await detail(db);
  assert.equal(stored.status, "awaiting_payment");
  assert.equal(stored.paid_at, null);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-1");
  await db.pg.close();
});

test("an order with two purchase units is held", async () => {
  const twoUnits = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [
      { payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [] } },
      { payee: { merchant_id: "MERCHANT-OTHER" }, payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" } }] } },
    ],
  };
  const run = await heldLookup(twoUnits);
  assert.equal(run.result.status, 409);
  await run.db.pg.close();
});

test("an order read whose capture is not completed is held", async () => {
  const declined = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [{ payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [{ id: "CAP-1", status: "DECLINED", amount: { currency_code: "USD", value: "80.00" } }] } }],
  };
  const run = await heldLookup(declined);
  assert.equal(run.result.status, 409);
  await run.db.pg.close();
});

test("an order read with two units is held when the first unit matches", async () => {
  const bothOurs = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [
      { payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" } }] } },
      { payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [{ id: "CAP-2", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" } }] } },
    ],
  };
  const run = await heldLookup(bothOurs);
  assert.equal(run.result.status, 409);
  await run.db.pg.close();
});

test("a capture response with two purchase units is held", async () => {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const body = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [
      { payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" } }] } },
      { payee: { merchant_id: "MERCHANT-OURS" } },
    ],
  };
  const result = await captureSandboxOrder(
    { db: db.checkout, paypal: createPaypalSandboxClient(config, fetchFor({ capture: body })), userId: CLIENT_ID },
    { orderId: "ORDER-1" },
  );
  assert.equal(result.status, 409);
  const stored = await detail(db);
  assert.equal(stored.status, "awaiting_payment");
  assert.equal(stored.paid_at, null);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-1");
  await db.pg.close();
});

test("an order read whose capture is pending is held", async () => {
  const pending = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [{ payee: { merchant_id: "MERCHANT-OURS" }, payments: { captures: [{ id: "CAP-1", status: "PENDING", amount: { currency_code: "USD", value: "80.00" } }] } }],
  };
  const run = await heldLookup(pending);
  assert.equal(run.result.status, 409);
  await run.db.pg.close();
});

test("an order read whose capture payee disagrees with the unit payee is held", async () => {
  const disagreed = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [{
      payee: { merchant_id: "MERCHANT-OURS" },
      payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" }, payee: { merchant_id: "MERCHANT-OTHER" } }] },
    }],
  };
  const run = await heldLookup(disagreed);
  assert.equal(run.result.status, 409);
  await run.db.pg.close();
});

test("a capture payee that disagrees with the unit payee is held", async () => {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const body = {
    id: "ORDER-1",
    status: "COMPLETED",
    purchase_units: [{
      payee: { merchant_id: "MERCHANT-OTHER" },
      payments: { captures: [{ id: "CAP-1", status: "COMPLETED", amount: { currency_code: "USD", value: "80.00" }, payee: { merchant_id: "MERCHANT-OURS" } }] },
    }],
  };
  const result = await captureSandboxOrder(
    { db: db.checkout, paypal: createPaypalSandboxClient(config, fetchFor({ capture: body })), userId: CLIENT_ID },
    { orderId: "ORDER-1" },
  );
  assert.equal(result.status, 409);
  const stored = await detail(db);
  assert.equal(stored.paid_at, null);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-1");
  await db.pg.close();
});

test("a webhook with two purchase units is held", async () => {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder({ db: db.checkout, paypal: stub, userId: CLIENT_ID }, { requestId: REQUEST_ID });
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
          payee: { merchant_id: "MERCHANT-OURS" },
          purchase_units: [
            { payee: { merchant_id: "MERCHANT-OURS" } },
            { payee: { merchant_id: "MERCHANT-OURS" } },
          ],
          supplementary_data: { related_ids: { order_id: "ORDER-1" } },
        },
      }),
    },
  );
  assert.equal("held" in webhook.body && webhook.body.held, true);
  const stored = await detail(db);
  assert.equal(stored.status, "awaiting_payment");
  assert.equal(stored.paid_at, null);
  assert.equal(stored.capture_disposition, "held");
  assert.equal(stored.merchant_proven, false);
  assert.equal(stored.capture_id, "CAP-1");
  await db.pg.close();
});
