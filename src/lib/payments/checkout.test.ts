import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createSandboxOrder, captureSandboxOrder, handleSandboxWebhook } from "@/lib/payments/checkout";
import {
  type CheckoutDb,
  type CheckoutRecord,
  type RequestRecord,
} from "@/lib/payments/checkout-db";
import { PAYPAL_SANDBOX_API, paypalButtonAvailable, readPaypalSandboxConfig } from "@/lib/payments/config";
import { normalizeUsd } from "@/lib/payments/money";
import { createPaypalSandboxClient, PaypalRequestError, type PaypalClient } from "@/lib/payments/paypal-client";

const requestId = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";

function request(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: requestId,
    clientId,
    status: "awaiting_payment",
    finalPrice: "80.00",
    currency: "USD",
    ref: 1001,
    paidAt: null,
    ...overrides,
  };
}

function createMemoryDb(seed: RequestRecord[]) {
  const requests = new Map(seed.map((row) => [row.id, { ...row }]));
  const checkouts: CheckoutRecord[] = [];
  let tail = Promise.resolve();
  const exclusive = <T>(fn: () => T): Promise<T> => {
    const run = tail.then(fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const db: CheckoutDb & { manualAdvance(requestId: string): Promise<"advanced" | "conflict"> } = {
    getRequest: (id) => exclusive(() => {
      const row = requests.get(id);
      return row ? { ...row } : null;
    }),
    getCheckoutByRequest: (id) => exclusive(() => {
      const row = checkouts.find((item) => item.requestId === id);
      return row ? { ...row } : null;
    }),
    getCheckoutByOrder: (orderId) => exclusive(() => {
      const row = checkouts.find((item) => item.orderId === orderId);
      return row ? { ...row } : null;
    }),
    bindOrder: (input) => exclusive(() => {
      if (!input.orderId.trim()) return { ok: false, reason: "invalid_order" };
      const amount = normalizeUsd(input.amount);
      const row = requests.get(input.requestId);
      if (!row) return { ok: false, reason: "request_not_found" };
      const finalPrice = normalizeUsd(row.finalPrice);
      if (input.currency !== "USD" || row.currency !== "USD" || !amount || !finalPrice || amount !== finalPrice) {
        return { ok: false, reason: "amount_mismatch" };
      }
      if (row.status !== "awaiting_payment") return { ok: false, reason: "not_payable" };
      const existing = checkouts.find((item) => item.requestId === input.requestId);
      if (existing) {
        if (existing.captureId || existing.amount !== amount) return { ok: false, reason: "not_payable" };
        return { ok: true, orderId: existing.orderId };
      }
      checkouts.push({
        requestId: input.requestId,
        orderId: input.orderId.trim(),
        captureId: null,
        amount,
        currency: "USD",
        capturedAt: null,
      });
      return { ok: true, orderId: input.orderId.trim() };
    }),
    completeCapture: (input) => exclusive(() => {
      if (!input.captureId.trim() || !input.orderId.trim()) return { ok: false, reason: "invalid_capture" };
      const amount = normalizeUsd(input.amount);
      const checkout = checkouts.find((item) => item.orderId === input.orderId.trim());
      if (!checkout) return { ok: false, reason: "order_not_found" };
      const row = requests.get(checkout.requestId);
      if (!row) return { ok: false, reason: "not_payable" };
      if (checkout.captureId) {
        if (checkout.captureId === input.captureId.trim() && row.status !== "awaiting_payment") {
          return { ok: true, result: "duplicate" };
        }
        if (checkout.captureId !== input.captureId.trim()) return { ok: false, reason: "capture_mismatch" };
        return { ok: false, reason: "not_payable" };
      }
      const finalPrice = normalizeUsd(row.finalPrice);
      if (input.currency !== "USD" || row.currency !== "USD" || !amount || !finalPrice || amount !== finalPrice || checkout.amount !== amount) {
        return { ok: false, reason: "amount_mismatch" };
      }
      if (row.status !== "awaiting_payment") return { ok: false, reason: "not_payable" };
      checkout.captureId = input.captureId.trim();
      checkout.capturedAt = "captured";
      row.status = "in_progress";
      row.paidAt = "paid-once";
      return { ok: true, result: "completed" };
    }),
    manualAdvance: (id) => exclusive(() => {
      const row = requests.get(id);
      if (!row || row.status !== "awaiting_payment") return "conflict";
      row.status = "in_progress";
      row.paidAt = "paid-manual";
      return "advanced";
    }),
  };
  return db;
}

function paypalMock(capture: PaypalClient["captureOrder"] = async () => ({
  captureId: "CAP-1",
  status: "COMPLETED" as const,
  amount: "80.00",
  currency: "USD" as const,
})) {
  const created: string[] = [];
  const captured: string[] = [];
  const client: PaypalClient = {
    async createOrder(amount) {
      created.push(amount);
      return { id: "ORDER-1" };
    },
    async captureOrder(orderId) {
      captured.push(orderId);
      return capture(orderId);
    },
    async verifyWebhook() {
      return true;
    },
  };
  return { client, created, captured };
}

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
  assert.equal(paypalButtonAvailable(config, { status: "pending", currency: "USD", finalPrice: "80.00" }), false);
  assert.equal(paypalButtonAvailable(config, { status: "awaiting_payment", currency: "IDR", finalPrice: "80.00" }), false);
});

test("order uses the stored final price, not a client amount", async () => {
  const db = createMemoryDb([request()]);
  const paypal = paypalMock();
  const result = await createSandboxOrder(
    { db, paypal: paypal.client, userId: clientId },
    { requestId, amount: "1.00" },
  );
  assert.deepEqual(result, { status: 200, body: { orderId: "ORDER-1" } });
  assert.deepEqual(paypal.created, ["80.00"]);
});

test("order rejects a different owner, a closed state, and a missing price", async () => {
  const paypal = paypalMock();
  const stranger = await createSandboxOrder(
    { db: createMemoryDb([request()]), paypal: paypal.client, userId: otherId },
    { requestId },
  );
  assert.equal(stranger.status, 403);
  const pending = await createSandboxOrder(
    { db: createMemoryDb([request({ status: "pending" })]), paypal: paypal.client, userId: clientId },
    { requestId },
  );
  assert.equal(pending.status, 409);
  const free = await createSandboxOrder(
    { db: createMemoryDb([request({ finalPrice: null })]), paypal: paypal.client, userId: clientId },
    { requestId },
  );
  assert.equal(free.status, 409);
  assert.deepEqual(paypal.created, []);
});

test("capture rejects an unconfirmed or mismatched PayPal result and never marks paid", async () => {
  const db = createMemoryDb([request()]);
  await createSandboxOrder({ db, paypal: paypalMock().client, userId: clientId }, { requestId });
  const paypal = paypalMock(async () => ({ status: "not_completed" }));
  const result = await captureSandboxOrder({ db, paypal: paypal.client, userId: clientId }, { orderId: "ORDER-1", amount: "1.00" });
  assert.equal(result.status, 409);
  const row = await db.getRequest(requestId);
  assert.equal(row?.status, "awaiting_payment");
  assert.equal(row?.paidAt, null);
});

test("capture refuses a completed PayPal amount other than the stored price", async () => {
  const db = createMemoryDb([request()]);
  await createSandboxOrder({ db, paypal: paypalMock().client, userId: clientId }, { requestId });
  const paypal = paypalMock(async () => ({ captureId: "CAP-X", status: "COMPLETED", amount: "1.00", currency: "USD" }));
  const result = await captureSandboxOrder({ db, paypal: paypal.client, userId: clientId }, { orderId: "ORDER-1" });
  assert.equal(result.status, 409);
  assert.equal((await db.getRequest(requestId))?.status, "awaiting_payment");
  assert.equal((await db.getRequest(requestId))?.paidAt, null);
});

test("capture marks paid once and a replay does not change paid_at", async () => {
  const db = createMemoryDb([request()]);
  const paypal = paypalMock();
  await createSandboxOrder({ db, paypal: paypal.client, userId: clientId }, { requestId });
  const first = await captureSandboxOrder({ db, paypal: paypal.client, userId: clientId }, { orderId: "ORDER-1" });
  assert.deepEqual(first.body, { ok: true, duplicate: false });
  const paid = await db.getRequest(requestId);
  const second = await captureSandboxOrder({ db, paypal: paypal.client, userId: clientId }, { orderId: "ORDER-1" });
  assert.deepEqual(second.body, { ok: true, duplicate: true });
  const again = await db.getRequest(requestId);
  assert.equal(again?.status, "in_progress");
  assert.equal(again?.paidAt, paid?.paidAt);
  assert.deepEqual(paypal.captured, ["ORDER-1"]);
});

test("capture and manual mark-paid cannot both win", async () => {
  const db = createMemoryDb([request()]);
  await db.bindOrder({ requestId, orderId: "ORDER-1", amount: "80.00", currency: "USD" });
  const [manual, captured] = await Promise.all([
    db.manualAdvance(requestId),
    db.completeCapture({ orderId: "ORDER-1", captureId: "CAP-1", amount: "80.00", currency: "USD" }),
  ]);
  const wins = [manual === "advanced", captured.ok].filter(Boolean);
  assert.equal(wins.length, 1);
  const row = await db.getRequest(requestId);
  assert.equal(row?.status, "in_progress");
  assert.ok(row?.paidAt);
});

test("webhook rejects a bad signature, ignores approval, and replays one capture", async () => {
  const db = createMemoryDb([request()]);
  await db.bindOrder({ requestId, orderId: "ORDER-1", amount: "80.00", currency: "USD" });
  let verified = false;
  const paypal: PaypalClient = {
    async createOrder() {
      return { id: "ORDER-1" };
    },
    async captureOrder() {
      return { status: "not_completed" };
    },
    async verifyWebhook() {
      return verified;
    },
  };
  const completed = JSON.stringify({
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "CAP-1",
      status: "COMPLETED",
      amount: { currency_code: "USD", value: "80.00" },
      supplementary_data: { related_ids: { order_id: "ORDER-1" } },
    },
  });
  const headers = new Headers();
  const rejected = await handleSandboxWebhook({ db, paypal }, { headers, rawBody: completed });
  assert.equal(rejected.status, 400);
  assert.equal((await db.getRequest(requestId))?.status, "awaiting_payment");

  verified = true;
  const approved = await handleSandboxWebhook(
    { db, paypal },
    { headers, rawBody: JSON.stringify({ event_type: "CHECKOUT.ORDER.APPROVED", resource: { status: "APPROVED" } }) },
  );
  assert.deepEqual(approved, { status: 200, body: { ignored: true } });
  assert.equal((await db.getRequest(requestId))?.paidAt, null);

  const mismatch = await handleSandboxWebhook(
    { db, paypal },
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
  assert.deepEqual(mismatch, { status: 200, body: { ignored: true } });
  assert.equal((await db.getRequest(requestId))?.status, "awaiting_payment");

  const first = await handleSandboxWebhook({ db, paypal }, { headers, rawBody: completed });
  assert.deepEqual(first.body, { ok: true, duplicate: false });
  const paidAt = (await db.getRequest(requestId))?.paidAt;
  const replay = await handleSandboxWebhook({ db, paypal }, { headers, rawBody: completed });
  assert.deepEqual(replay.body, { ok: true, duplicate: true });
  assert.equal((await db.getRequest(requestId))?.paidAt, paidAt);
});

test("sandbox client calls only the sandbox host and hides provider bodies", async () => {
  const source = readFileSync(new URL("./paypal-client.ts", import.meta.url), "utf8");
  assert.equal(source.includes("https://api-m.paypal.com"), false);
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    urls.push(url);
    assert.equal(url.startsWith(PAYPAL_SANDBOX_API), true);
    if (url.endsWith("/v1/oauth2/token")) {
      return Response.json({ access_token: "token-marker", token_type: "Bearer" });
    }
    if (url.endsWith("/v2/checkout/orders")) {
      const sent: unknown = JSON.parse(String(init?.body));
      assert.equal(JSON.stringify(sent).includes("\"value\":\"80.00\""), true);
      return Response.json({ id: "ORDER-1", status: "CREATED" });
    }
    if (url.endsWith("/capture")) {
      return Response.json({
        id: "ORDER-1",
        status: "APPROVED",
        purchase_units: [],
      });
    }
    return Response.json({ secret: "provider-body-marker" }, { status: 500 });
  };
  const config = readPaypalSandboxConfig(fullEnv);
  assert.ok(config);
  const client = createPaypalSandboxClient(config, fetchImpl);
  assert.deepEqual(await client.createOrder("80.00", requestId, 1001), { id: "ORDER-1" });
  assert.deepEqual(await client.captureOrder("ORDER-1"), { status: "not_completed" });
  const badCert = new Headers({
    "paypal-transmission-id": "t",
    "paypal-transmission-time": "t",
    "paypal-transmission-sig": "t",
    "paypal-cert-url": "https://evil.example/cert",
    "paypal-auth-algo": "SHA256withRSA",
  });
  assert.equal(await client.verifyWebhook(badCert, { id: "evt" }), false);
  assert.equal(await client.verifyWebhook(new Headers(), { id: "evt" }), false);
  await assert.rejects(
    () =>
      createPaypalSandboxClient(
        config,
        async () => Response.json({ secret: "provider-body-marker" }, { status: 500 }),
      ).createOrder("80.00", requestId, 1001),
    (err: unknown) => {
      assert.ok(err instanceof PaypalRequestError);
      assert.equal(err.message.includes("provider-body-marker"), false);
      assert.equal(String(err).includes("provider-body-marker"), false);
      return true;
    },
  );
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
      if (key !== "PAYPAL_ENV" && value) process.env[key] = value;
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
    for (const key of Object.keys(fullEnv)) {
      if (!previous.has(key)) delete process.env[key];
    }
  }
});
