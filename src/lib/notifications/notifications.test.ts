import assert from "node:assert/strict";
import test from "node:test";
import { inquiryAdminEmail, inquiryClientEmail, paymentAdminEmail, paymentClientEmail } from "@/lib/notifications/copy";
import { isFreshCapture, webhookOrderId } from "@/lib/notifications/payment";

const inquiry = {
  name: "Rina\nInjected: header",
  email: "rina@example.com",
  projectType: "retainer",
  budget: "500-2k",
  message: "I'd like a monthly character art retainer for our game.",
};

test("inquiry emails use readable labels and keep the subject on one line", () => {
  const admin = inquiryAdminEmail(inquiry);
  assert.equal(admin.subject, "New inquiry: Monthly retainer — Rina Injected: header");
  assert.ok(!admin.subject.includes("\n"));
  assert.ok(admin.lines.some((l) => l.includes("Budget: $500 – $2,000")));
  assert.ok(admin.lines.includes(inquiry.message));
  assert.equal(admin.cta?.path, "/admin/inquiries");

  const client = inquiryClientEmail(inquiry);
  assert.ok(client.lines[0].startsWith("Hi Rina"));
  assert.ok(client.lines.includes(inquiry.message));
});

test("unknown option values fall back to the raw value", () => {
  assert.ok(inquiryAdminEmail({ ...inquiry, projectType: "zine" }).subject.includes("zine"));
});

const req = {
  id: "11111111-1111-4111-8111-111111111111",
  ref: 42,
  contact_name: "Rina",
  contact_email: "rina@example.com",
  service_title: "Character Illustration",
  package_name: "Full body",
  final_price: "150.00",
};

test("payment emails show the amount and link to the right pages", () => {
  const client = paymentClientEmail(req);
  assert.equal(client.subject, "Payment received — Character Illustration (#42)");
  assert.ok(client.lines[1].includes("$150"));
  assert.equal(client.cta?.path, `/account/requests/${req.id}`);

  const admin = paymentAdminEmail(req);
  assert.ok(admin.subject.startsWith("Paid: #42"));
  assert.equal(admin.cta?.path, `/admin/requests/${req.id}`);
  assert.ok(!paymentClientEmail({ ...req, final_price: null }).lines[1].includes("$"));
});

test("only a first settlement triggers the payment email", () => {
  assert.equal(isFreshCapture({ status: 200, body: { ok: true, duplicate: false } }), true);
  assert.equal(isFreshCapture({ status: 200, body: { ok: true, duplicate: true } }), false);
  assert.equal(isFreshCapture({ status: 200, body: { held: true } }), false);
  assert.equal(isFreshCapture({ status: 409, body: { error: "x" } }), false);
});

test("webhookOrderId reads the related order id", () => {
  const body = JSON.stringify({ resource: { supplementary_data: { related_ids: { order_id: "ORDER-1" } } } });
  assert.equal(webhookOrderId(body), "ORDER-1");
  assert.equal(webhookOrderId("{}"), null);
  assert.equal(webhookOrderId("not json"), null);
});
