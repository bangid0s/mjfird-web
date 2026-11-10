import assert from "node:assert/strict";
import test from "node:test";
import { captureSandboxOrder, createSandboxOrder, handleSandboxWebhook } from "@/lib/payments/checkout";
import { PAYPAL_SANDBOX_API, readPaypalSandboxConfig } from "@/lib/payments/config";
import { createPaypalSandboxClient } from "@/lib/payments/paypal-client";
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

function body(opts: { orderId?: string; captureId?: string; status?: string; currency?: string; amount?: string; payee?: string; captures?: unknown[] }) {
  const captures = opts.captures ?? [
    {
      id: opts.captureId ?? "CAP-1",
      status: opts.status ?? "COMPLETED",
      amount: { currency_code: opts.currency ?? "USD", value: opts.amount ?? "80.00" },
      payee: { merchant_id: opts.payee ?? "OUR-MERCHANT" },
    },
  ];
  return { id: opts.orderId ?? "ORDER-1", status: "COMPLETED", purchase_units: [{ payments: { captures } }] };
}

async function capture(responseBody: unknown, status = 200) {
  assert.ok(config);
  const db = await createPaypalTestDb();
  await db.seed();
  await createSandboxOrder(
    {
      db: db.checkout,
      paypal: {
        async createOrder() {
          return { id: "ORDER-1" };
        },
        async captureOrder() {
          return { outcome: "uncertain" as const, evidence: "uncertain", captureId: null };
        },
        async confirmOrderPayee() {
          return { ok: false as const, evidence: "unused" };
        },
        async verifyWebhook() {
          return false;
        },
      },
      userId: CLIENT_ID,
    },
    { requestId: REQUEST_ID },
  );
  const releases: string[] = [];
  const original = db.checkout.releaseCapture.bind(db.checkout);
  db.checkout.releaseCapture = async (orderId) => {
    releases.push(orderId);
    await original(orderId);
  };
  const paypal = createPaypalSandboxClient(config, async (input) => {
    const url = String(input);
    assert.equal(url.startsWith(PAYPAL_SANDBOX_API), true);
    if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "tok", token_type: "Bearer" });
    return Response.json(responseBody, { status });
  });
  const result = await captureSandboxOrder({ db: db.checkout, paypal, userId: CLIENT_ID }, { orderId: "ORDER-1" });
  return { db, result, releases };
}

test("a matching capture pays, and a mismatched capture is kept but not paid", async () => {
  const paid = await capture(body({}));
  assert.equal(paid.result.status, 200);
  assert.equal((await paid.db.read()).captureId, "CAP-1");
  assert.equal((await paid.db.read()).status, "in_progress");
  await paid.db.pg.close();

  const wrong = await capture(body({ amount: "1.00", captureId: "CAP-WRONG" }));
  assert.equal(wrong.releases.length, 0);
  assert.equal((await wrong.db.read()).captureId, "CAP-WRONG");
  assert.equal((await wrong.db.read()).capturePending, true);
  assert.equal((await wrong.db.read()).paidAt, null);
  assert.notEqual(await wrong.db.manualMark(), "advanced");
  assert.equal(await wrong.db.cancelClient(), "blocked");
  await wrong.db.pg.close();

  const euros = await capture(body({ currency: "EUR", captureId: "CAP-EUR" }));
  assert.equal(euros.releases.length, 0);
  assert.equal((await euros.db.read()).captureId, "CAP-EUR");
  assert.equal((await euros.db.read()).status, "awaiting_payment");
  await euros.db.pg.close();
});

test("pending, ambiguous, and multiple captures stay claimed", async () => {
  const pending = await capture(body({ status: "PENDING", captureId: "CAP-PEND" }));
  assert.equal(pending.releases.length, 0);
  assert.equal((await pending.db.read()).capturePending, true);
  assert.equal(await pending.db.cancelClient(), "blocked");
  const completed = await handleSandboxWebhook(
    { db: pending.db.checkout, paypal: { async createOrder() { return { id: "ORDER-1" }; }, async captureOrder() { return { outcome: "uncertain" as const, evidence: "uncertain", captureId: null }; }, async confirmOrderPayee() { return { ok: false as const, evidence: "unused" }; }, async verifyWebhook() { return true; } }, expectedMerchant: "OUR-MERCHANT" },
    {
      headers: new Headers(),
      rawBody: JSON.stringify({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAP-PEND",
          status: "COMPLETED",
          amount: { currency_code: "USD", value: "80.00" },
          payee: { merchant_id: "OUR-MERCHANT" },
          supplementary_data: { related_ids: { order_id: "ORDER-1" } },
        },
      }),
    },
  );
  assert.equal(completed.status, 200);
  assert.notEqual((await pending.db.read()).status, "cancelled");
  assert.equal((await pending.db.read()).paidAt === null, false);
  await pending.db.pg.close();

  const ambiguous = await capture({ id: "ORDER-1", status: "COMPLETED" });
  assert.equal(ambiguous.releases.length, 0);
  assert.equal((await ambiguous.db.read()).capturePending, true);
  await ambiguous.db.pg.close();

  const many = await capture(body({
    captures: [
      { id: "CAP-A", status: "COMPLETED", amount: { currency_code: "USD", value: "40.00" } },
      { id: "CAP-B", status: "COMPLETED", amount: { currency_code: "USD", value: "40.00" } },
    ],
  }));
  assert.equal(many.releases.length, 0);
  assert.equal((await many.db.read()).capturePending, true);
  const evidence = await many.db.pg.query<{ provider_evidence: string | null }>(
    "select provider_evidence from commission_paypal_checkouts where order_id = 'ORDER-1'",
  );
  assert.match(evidence.rows[0]?.provider_evidence ?? "", /CAP-A/);
  assert.match(evidence.rows[0]?.provider_evidence ?? "", /CAP-B/);
  await many.db.pg.close();
});

test("uncertain results stay recorded, and a merchant hold is not paid by a later webhook", async () => {
  const ambiguous = await capture({ id: "ORDER-1", status: "COMPLETED" });
  assert.equal(ambiguous.releases.length, 0);
  const declined = await captureSandboxOrder(
    {
      db: ambiguous.db.checkout,
      paypal: createPaypalSandboxClient(config!, async (input) => {
        const url = String(input);
        if (url.endsWith("/v1/oauth2/token")) return Response.json({ access_token: "tok", token_type: "Bearer" });
        return Response.json({
          id: "ORDER-1",
          status: "DECLINED",
          purchase_units: [{ payments: { captures: [{ id: "CAP-NO", status: "DECLINED", amount: { currency_code: "USD", value: "80.00" }, payee: { merchant_id: "OUR-MERCHANT" } }] } }],
        });
      }),
      userId: CLIENT_ID,
    },
    { orderId: "ORDER-1" },
  );
  assert.equal(declined.status, 409);
  const kept = await ambiguous.db.pg.query<{ capture_pending: boolean; capture_disposition: string; provider_evidence: string | null }>(
    "select capture_pending, capture_disposition, provider_evidence from commission_paypal_checkouts where order_id = 'ORDER-1'",
  );
  assert.equal(kept.rows[0]?.capture_pending, true);
  assert.notEqual(kept.rows[0]?.capture_disposition, "open");
  assert.ok(kept.rows[0]?.provider_evidence);
  await ambiguous.db.pg.close();

  const merchant = await capture(body({ payee: "NOT-OURS", captureId: "CAP-PAY" }));
  const webhook = await handleSandboxWebhook(
    {
      db: merchant.db.checkout,
      paypal: {
        async createOrder() {
          return { id: "ORDER-1" };
        },
        async captureOrder() {
          return { outcome: "uncertain", evidence: "uncertain", captureId: null };
        },
        async confirmOrderPayee() {
          return { ok: false as const, evidence: "unused" };
        },
        async verifyWebhook() {
          return true;
        },
      },
    },
    {
      headers: new Headers(),
      rawBody: JSON.stringify({
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: {
          id: "CAP-PAY",
          status: "COMPLETED",
          amount: { currency_code: "USD", value: "80.00" },
          payee: { merchant_id: "NOT-OURS" },
          supplementary_data: { related_ids: { order_id: "ORDER-1" } },
        },
      }),
    },
  );
  assert.equal("held" in webhook.body && webhook.body.held, true);
  assert.equal((await merchant.db.read()).status, "awaiting_payment");
  assert.equal((await merchant.db.read()).paidAt, null);
  assert.equal((await merchant.db.read()).captureId, "CAP-PAY");
  await merchant.db.pg.close();
});

test("a foreign merchant or a different response order id is not paid", async () => {
  const foreign = await capture(body({ payee: "NOT-OUR-MERCHANT", captureId: "CAP-PAYEE" }));
  assert.equal(foreign.result.status, 409);
  assert.equal((await foreign.db.read()).status, "awaiting_payment");
  assert.equal(foreign.releases.length, 0);
  await foreign.db.pg.close();

  const other = await capture(body({ orderId: "ORDER-OTHER", captureId: "CAP-OTHER" }));
  assert.equal(other.result.status, 409);
  assert.equal((await other.db.read()).captureId, "CAP-OTHER");
  assert.equal((await other.db.read()).status, "awaiting_payment");
  assert.equal((await other.db.read()).capturePending, true);
  await other.db.pg.close();
});
