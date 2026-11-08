import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { friendlyRpcError, manualAdvanceConflict, manualWritePlan } from "@/lib/commissions/status";
import { captureSandboxOrder, createSandboxOrder, handleSandboxWebhook, orderIdempotencyKey, captureIdempotencyKey } from "@/lib/payments/checkout";
import { PAYPAL_SANDBOX_API, paypalButtonAvailable, readPaypalSandboxConfig } from "@/lib/payments/config";
import { normalizeUsd } from "@/lib/payments/money";
import { createPaypalSandboxClient, PaypalRequestError, type CaptureInterpretation, type PaypalClient } from "@/lib/payments/paypal-client";
import { CLIENT_ID, REQUEST_ID, createPaypalTestDb } from "@/lib/payments/paypal-test-db";

const fullEnv: Record<string, string> = {
  PAYPAL_ENV: "sandbox",
  PAYPAL_CLIENT_ID: "sandbox-client",
  PAYPAL_CLIENT_SECRET: "sandbox-secret",
  PAYPAL_WEBHOOK_ID: "WH-test",
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: "sandbox-client",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  NEXT_PUBLIC_SUPABASE_URL: "https://isolated.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
};

function hold() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function scriptedPaypal(options?: { capture?: CaptureInterpretation }) {
  const orders = new Map<string, { id: string; amount: string }>();
  const captures = new Map<string, CaptureInterpretation>();
  let orderCalls = 0;
  let captureCharges = 0;
  let captureCalls = 0;
  let pauseCreate: Promise<void> | null = null;
  let pauseCapture: Promise<void> | null = null;
  let noteCreate: (() => void) | null = null;
  let noteCapture: (() => void) | null = null;
  const client: PaypalClient = {
    async createOrder(amount, _requestId, _ref, key) {
      orderCalls += 1;
      const existing = orders.get(key);
      if (!existing) orders.set(key, { id: "ORDER-1", amount });
      if (noteCreate && orderCalls === 1) noteCreate();
      if (pauseCreate && orderCalls === 1) await pauseCreate;
      const stored = orders.get(key);
      if (!stored) throw new Error("missing order");
      return { id: stored.id };
    },
    async captureOrder(_orderId, key) {
      captureCalls += 1;
      const existing = captures.get(key);
      if (existing) return existing;
      const captured = options?.capture ?? {
        outcome: "completed" as const,
        orderId: "ORDER-1",
        captureId: "CAP-1",
        amount: "80.00",
        currency: "USD",
        merchantId: null,
      };
      if (captured.outcome !== "completed") return captured;
      captures.set(key, captured);
      captureCharges += 1;
      if (noteCapture && captureCharges === 1) noteCapture();
      if (pauseCapture && captureCharges === 1) await pauseCapture;
      return captured;
    },
    async verifyWebhook() {
      return true;
    },
  };
  return {
    client,
    orders,
    stats: () => ({ orderCalls, captureCharges, captureCalls }),
    pauseCreate(promise: Promise<void>) {
      pauseCreate = promise;
    },
    pauseCapture(promise: Promise<void>) {
      pauseCapture = promise;
    },
    whenCreateStarted() {
      return new Promise<void>((resolve) => {
        noteCreate = resolve;
      });
    },
    whenCaptureStarted() {
      return new Promise<void>((resolve) => {
        noteCapture = resolve;
      });
    },
  };
}

async function seeded() {
  const db = await createPaypalTestDb();
  await db.seed();
  return db;
}

test("money rejects zero, extra decimals, and non-USD-shaped values", () => {
  assert.equal(normalizeUsd("80.5"), "80.50");
  assert.equal(normalizeUsd("0"), null);
  assert.equal(normalizeUsd("0.00"), null);
  assert.equal(normalizeUsd("-5"), null);
  assert.equal(normalizeUsd("10.999"), null);
  assert.equal(normalizeUsd("1e2"), null);
});

test("PayPal stays disabled unless every sandbox name is set", () => {
  assert.equal(readPaypalSandboxConfig({}), null);
  assert.equal(readPaypalSandboxConfig({ ...fullEnv, PAYPAL_ENV: "live" }), null);
  assert.equal(readPaypalSandboxConfig({ ...fullEnv, PAYPAL_CLIENT_SECRET: "  " }), null);
  const config = readPaypalSandboxConfig(fullEnv);
  assert.ok(config);
  assert.equal(PAYPAL_SANDBOX_API, "https://api-m.sandbox.paypal.com");
  assert.equal(paypalButtonAvailable(null, { status: "awaiting_payment", currency: "USD", finalPrice: "80.00" }), false);
  assert.equal(paypalButtonAvailable(config, { status: "awaiting_payment", currency: "USD", finalPrice: "80.00" }), true);
  assert.equal(paypalButtonAvailable(config, { status: "awaiting_payment", currency: "USD", finalPrice: "0" }), false);
});

test("order uses the stored final price, not a client amount", async () => {
  const db = await seeded();
  const paypal = scriptedPaypal();
  const result = await createSandboxOrder(
    { db: db.checkout, paypal: paypal.client, userId: CLIENT_ID },
    { requestId: REQUEST_ID, amount: "1.00" },
  );
  assert.deepEqual(result, { status: 200, body: { orderId: "ORDER-1" } });
  assert.equal(paypal.orders.get(orderIdempotencyKey(REQUEST_ID))?.amount, "80.00");
});

test("concurrent orders share one provider order id", async () => {
  const db = await seeded();
  const paypal = scriptedPaypal();
  const gate = hold();
  paypal.pauseCreate(gate.promise);
  const started = paypal.whenCreateStarted();
  const first = createSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  await started;
  const second = createSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  gate.release();
  const results = await Promise.all([first, second]);
  assert.deepEqual(results.map((result) => result.body), [{ orderId: "ORDER-1" }, { orderId: "ORDER-1" }]);
  assert.equal(paypal.orders.size, 1);
  assert.equal((await db.read()).orderId, "ORDER-1");
});

test("order rejects a different owner, a closed state, and a missing price", async () => {
  const paypal = scriptedPaypal();
  const strangerDb = await seeded();
  const stranger = await createSandboxOrder(
    { db: strangerDb.checkout, paypal: paypal.client, userId: "33333333-3333-4333-8333-333333333333" },
    { requestId: REQUEST_ID },
  );
  assert.equal(stranger.status, 403);
  const pending = await createPaypalTestDb();
  await pending.seed("80.00", "pending");
  assert.equal(
    (await createSandboxOrder({ db: pending.checkout, paypal: paypal.client, userId: CLIENT_ID }, { requestId: REQUEST_ID })).status,
    409,
  );
  const free = await createPaypalTestDb();
  await free.seed("0.00");
  assert.equal(
    (await createSandboxOrder({ db: free.checkout, paypal: paypal.client, userId: CLIENT_ID }, { requestId: REQUEST_ID })).status,
    409,
  );
  assert.equal(paypal.stats().orderCalls, 0);
});

test("manual payment before capture does not call PayPal", async () => {
  const db = await seeded();
  const paypal = scriptedPaypal();
  await createSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  assert.equal(await db.manualMark(), "advanced");
  const result = await captureSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(result.status, 409);
  assert.equal(paypal.stats().captureCharges, 0);
  const state = await db.read();
  assert.equal(state.status, "in_progress");
  assert.equal(state.captureId, null);
  assert.equal(state.capturePending, false);
});

test("manual payment during the provider call is blocked and the charge is stored", async () => {
  const db = await seeded();
  const paypal = scriptedPaypal();
  await createSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const gate = hold();
  paypal.pauseCapture(gate.promise);
  const started = paypal.whenCaptureStarted();
  const pending = captureSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  await started;
  assert.equal(await db.manualMark(), "blocked");
  assert.equal(await db.cancelClient(), "blocked");
  assert.equal((await db.read()).status, "awaiting_payment");
  gate.release();
  const result = await pending;
  assert.deepEqual(result.body, { ok: true, duplicate: false });
  const state = await db.read();
  assert.equal(state.status, "in_progress");
  assert.equal(state.captureId, "CAP-1");
  assert.equal(state.capturePending, false);
  assert.equal(paypal.stats().captureCharges, 1);
  assert.equal(await db.manualMark(), "blocked");
  assert.equal((await db.read()).captureId, "CAP-1");
});

test("a provider capture that fails to finalize is stored on retry without a second charge", async () => {
  const db = await seeded();
  const paypal = scriptedPaypal();
  await createSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  db.failNextComplete();
  const failed = await captureSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(failed.status, 502);
  const midway = await db.read();
  assert.equal(midway.status, "awaiting_payment");
  assert.equal(midway.captureId, null);
  assert.equal(midway.capturePending, true);
  const retried = await captureSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.deepEqual(retried.body, { ok: true, duplicate: false });
  assert.equal(paypal.stats().captureCharges, 1);
  assert.equal(paypal.stats().captureCalls, 2);
  const state = await db.read();
  assert.equal(state.status, "in_progress");
  assert.equal(state.captureId, "CAP-1");
  assert.equal(state.capturePending, false);
});

test("concurrent captures share one provider charge", async () => {
  const db = await seeded();
  const paypal = scriptedPaypal();
  await createSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const gate = hold();
  paypal.pauseCapture(gate.promise);
  const started = paypal.whenCaptureStarted();
  const first = captureSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  await started;
  const second = captureSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  gate.release();
  const results = await Promise.all([first, second]);
  assert.deepEqual(results.map((result) => result.status), [200, 200]);
  assert.equal(results.filter((result) => "duplicate" in result.body && result.body.duplicate).length, 1);
  assert.equal(paypal.stats().captureCharges, 1);
  const state = await db.read();
  assert.equal(state.status, "in_progress");
  assert.equal(state.captureId, "CAP-1");
  const paidAt = state.paidAt;
  const replay = await captureSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.deepEqual(replay.body, { ok: true, duplicate: true });
  assert.equal((await db.read()).paidAt, paidAt);
});

test("an uncertain provider result keeps the claim, and a declined capture is the release", async () => {
  const pendingDb = await seeded();
  const pending = scriptedPaypal({ capture: { outcome: "uncertain", evidence: "uncertain", captureId: null } });
  await createSandboxOrder({ db: pendingDb.checkout, paypal: pending.client, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const pendingResult = await captureSandboxOrder({ db: pendingDb.checkout, paypal: pending.client, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(pendingResult.status, 502);
  assert.equal((await pendingDb.read()).capturePending, true);
  assert.equal(await pendingDb.cancelClient(), "blocked");
  assert.equal((await pendingDb.read()).status, "awaiting_payment");

  const declinedDb = await seeded();
  const declined = scriptedPaypal({ capture: { outcome: "not_charged" } });
  await createSandboxOrder({ db: declinedDb.checkout, paypal: declined.client, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  const declinedResult = await captureSandboxOrder({ db: declinedDb.checkout, paypal: declined.client, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  assert.equal(declinedResult.status, 409);
  assert.equal((await declinedDb.read()).capturePending, false);
  assert.equal((await declinedDb.read()).captureId, null);
  assert.equal(await declinedDb.manualMark(), "advanced");
});

test("webhook ignores approval and a mismatched amount, then stores one replayed capture", async () => {
  const db = await seeded();
  const paypal = scriptedPaypal();
  await createSandboxOrder({ db: db.checkout, paypal: paypal.client, userId: CLIENT_ID }, { requestId: REQUEST_ID });
  let verified = false;
  const guarded: PaypalClient = { ...paypal.client, verifyWebhook: async () => verified };
  const headers = new Headers();
  const completed = JSON.stringify({
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "CAP-1",
      status: "COMPLETED",
      amount: { currency_code: "USD", value: "80.00" },
      supplementary_data: { related_ids: { order_id: "ORDER-1" } },
    },
  });
  assert.equal((await handleSandboxWebhook({ db: db.checkout, paypal: guarded }, { headers, rawBody: completed })).status, 400);
  verified = true;
  const approved = await handleSandboxWebhook(
    { db: db.checkout, paypal: guarded },
    { headers, rawBody: JSON.stringify({ event_type: "CHECKOUT.ORDER.APPROVED", resource: { status: "APPROVED" } }) },
  );
  assert.deepEqual(approved, { status: 200, body: { ignored: true } });
  const first = await handleSandboxWebhook({ db: db.checkout, paypal: guarded }, { headers, rawBody: completed });
  assert.deepEqual(first.body, { ok: true, duplicate: false });
  const paidAt = (await db.read()).paidAt;
  const replay = await handleSandboxWebhook({ db: db.checkout, paypal: guarded }, { headers, rawBody: completed });
  assert.deepEqual(replay.body, { ok: true, duplicate: true });
  assert.equal((await db.read()).paidAt, paidAt);
  assert.equal((await db.read()).captureId, "CAP-1");
  const mismatch = await handleSandboxWebhook(
    { db: db.checkout, paypal: guarded },
    {
      headers,
      rawBody: JSON.stringify({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAP-2",
          status: "COMPLETED",
          amount: { currency_code: "USD", value: "1.00" },
          supplementary_data: { related_ids: { order_id: "ORDER-1" } },
        },
      }),
    },
  );
  assert.equal("held" in mismatch.body && mismatch.body.held, true);
  assert.equal((await db.read()).captureId, "CAP-1");
  assert.equal((await db.read()).paidAt, paidAt);
});

test("sandbox client calls only the sandbox host and hides provider bodies", async () => {
  const source = readFileSync(new URL("./paypal-client.ts", import.meta.url), "utf8");
  assert.equal(source.includes("https://api-m.paypal.com"), false);
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    assert.equal(url.startsWith(PAYPAL_SANDBOX_API), true);
    const headers = new Headers(init?.headers);
    if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "token-marker", token_type: "Bearer" });
    if (url.endsWith("/v2/checkout/orders")) {
      assert.equal(headers.get("PayPal-Request-Id"), orderIdempotencyKey(REQUEST_ID));
      return Response.json({ id: "ORDER-1", status: "CREATED" });
    }
    if (url.endsWith("/capture")) {
      assert.equal(headers.get("PayPal-Request-Id"), captureIdempotencyKey("ORDER-1"));
      return Response.json({ id: "ORDER-1", status: "APPROVED", purchase_units: [] });
    }
    return Response.json({ secret: "provider-body-marker" }, { status: 500 });
  };
  const config = readPaypalSandboxConfig(fullEnv);
  assert.ok(config);
  const client = createPaypalSandboxClient(config, fetchImpl);
  assert.deepEqual(await client.createOrder("80.00", REQUEST_ID, 1001, orderIdempotencyKey(REQUEST_ID)), { id: "ORDER-1" });
  assert.deepEqual(await client.captureOrder("ORDER-1", captureIdempotencyKey("ORDER-1")), {
    outcome: "uncertain",
    evidence: "no-captures APPROVED",
    captureId: null,
  });
  const badCert = new Headers({
    "paypal-transmission-id": "t",
    "paypal-transmission-time": "t",
    "paypal-transmission-sig": "t",
    "paypal-cert-url": "https://evil.example/cert",
    "paypal-auth-algo": "SHA256withRSA",
  });
  assert.equal(await client.verifyWebhook(badCert, { id: "evt" }), false);
  await assert.rejects(
    () =>
      createPaypalSandboxClient(config, async () => Response.json({ secret: "provider-body-marker" }, { status: 500 })).createOrder(
        "80.00",
        REQUEST_ID,
        1001,
        orderIdempotencyKey(REQUEST_ID),
      ),
    (err: unknown) => {
      assert.ok(err instanceof PaypalRequestError);
      assert.equal(err.message.includes("provider-body-marker"), false);
      return true;
    },
  );
});

test("manual writes stay on the old path only before the PayPal table exists", () => {
  assert.equal(manualWritePlan({ rpcMissing: true, checkoutTable: "absent", paypalEnabled: false }), "legacy");
  assert.equal(manualWritePlan({ rpcMissing: true, checkoutTable: "present", paypalEnabled: false }), "fail_closed");
  assert.equal(manualWritePlan({ rpcMissing: true, checkoutTable: "absent", paypalEnabled: true }), "fail_closed");
  assert.equal(manualWritePlan({ rpcMissing: false, checkoutTable: "absent", paypalEnabled: false }), "rpc");
});

test("conflict copy names an in-progress capture without echoing the database error", () => {
  assert.equal(manualAdvanceConflict("capture_in_progress"), "PayPal checkout is in progress. Refresh to confirm before changing this request.");
  assert.equal(manualAdvanceConflict("capture_recorded"), "PayPal already captured this payment.");
  assert.equal(manualAdvanceConflict("ERROR: not_payable\nSQL context"), "This request changed. Refresh and try again.");
  assert.equal(friendlyRpcError("capture_in_progress"), "PayPal checkout is in progress. Refresh to confirm before changing this request.");
});

test("order route stays unavailable without a complete sandbox env and does not call fetch", async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    throw new Error("network");
  };
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(fullEnv)) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }
  try {
    const { POST } = await import("@/app/api/payments/paypal/order/route");
    const missing = await POST(new Request("http://localhost/api/payments/paypal/order", { method: "POST", body: "{}" }));
    assert.equal(missing.status, 404);
    process.env.PAYPAL_ENV = "live";
    for (const [key, value] of Object.entries(fullEnv)) {
      if (key !== "PAYPAL_ENV") process.env[key] = value;
    }
    const live = await POST(new Request("http://localhost/api/payments/paypal/order", { method: "POST", body: "{}" }));
    assert.equal(live.status, 404);
    const capture = await import("@/app/api/payments/paypal/capture/route");
    const webhook = await import("@/app/api/webhooks/paypal/route");
    assert.equal((await capture.POST(new Request("http://localhost/api/payments/paypal/capture", { method: "POST", body: "{}" }))).status, 404);
    assert.equal((await webhook.POST(new Request("http://localhost/api/webhooks/paypal", { method: "POST", body: "{}" }))).status, 404);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = original;
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
