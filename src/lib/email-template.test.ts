import assert from "node:assert/strict";
import test from "node:test";
import { headlineOf, preheaderOf, renderEmailHtml } from "@/lib/email-template";

test("headline drops the subject's trailing detail", () => {
  assert.equal(headlineOf("Payment received — Character Illustration (#42)"), "Payment received");
  assert.equal(headlineOf("New message about your request #42"), "New message about your request #42");
});

test("preheader skips the greeting", () => {
  assert.equal(preheaderOf(["Hi Rina,", "Your payment is confirmed."]), "Your payment is confirmed.");
});

test("layout escapes user text and includes the button and fallback link", () => {
  const html = renderEmailHtml({
    subject: "New message — <b>x</b>",
    lines: ["Hi Rina,", "<script>alert(1)</script>\nsecond line"],
    cta: { label: "Reply", href: "https://mjfird.com/account/requests/1" },
    siteUrl: "https://mjfird.com",
  });
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("<br>second line"));
  assert.equal(html.split('href="https://mjfird.com/account/requests/1"').length - 1, 2);
  assert.ok(html.includes(">New message</h1>"));
});

test("no CTA means no button", () => {
  const html = renderEmailHtml({ subject: "Hi", lines: ["Hello there."], siteUrl: "https://mjfird.com" });
  assert.ok(!html.includes("Button not working"));
});
