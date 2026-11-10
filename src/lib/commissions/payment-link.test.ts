import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { RequestPayment } from "@/components/commissions/RequestPayment";
import { formatUSD } from "@/lib/services/storefront";
import {
  PaymentUrlError,
  acceptEmailCopy,
  clientPaymentView,
  normalizePaymentUrl,
  paymentReadyEmailCopy,
  paymentWriteMessage,
  payWithPaypalLabel,
} from "@/lib/commissions/payment-link";

const invoice = "https://www.paypal.com/invoice/payerView/details/INV2-ABC?v=1";

test("accepts PayPal invoice and PayPal.me links and keeps path case", () => {
  assert.equal(normalizePaymentUrl(invoice), invoice);
  assert.equal(normalizePaymentUrl("https://paypal.me/MJFird"), "https://paypal.me/MJFird");
  assert.equal(normalizePaymentUrl("https://www.paypal.me/studio"), "https://www.paypal.me/studio");
  assert.equal(normalizePaymentUrl("https://paypal.com"), "https://paypal.com");
  assert.equal(normalizePaymentUrl("HTTPS://PayPal.com/Invoice"), "https://paypal.com/Invoice");
  assert.equal(normalizePaymentUrl("  https://www.paypal.com:443/pay  "), "https://www.paypal.com/pay");
  assert.equal(normalizePaymentUrl("https://paypal.com/path?amount=1.00&currency=USD"), "https://paypal.com/path?amount=1.00&currency=USD");
  assert.equal(normalizePaymentUrl("https://paypal.me/name#paid"), "https://paypal.me/name#paid");
  assert.equal(normalizePaymentUrl("https://paypal.com/x?email=a@b.com"), "https://paypal.com/x?email=a@b.com");
});

test("empty and null clear the link", () => {
  assert.equal(normalizePaymentUrl(null), null);
  assert.equal(normalizePaymentUrl(undefined), null);
  assert.equal(normalizePaymentUrl(""), null);
  assert.equal(normalizePaymentUrl("   "), null);
});

test("rejects schemes, lookalikes, credentials, ports, IPs, and length", () => {
  const rejected = [
    "http://paypal.com/invoice",
    "http://www.paypal.com/invoice",
    "HTTP://paypal.me/name",
    "//paypal.com/invoice",
    "//www.paypal.com/invoice",
    "javascript:alert(1)",
    "javascript:https://paypal.com",
    "data:text/html,https://paypal.com",
    "https://user@paypal.com/invoice",
    "https://user:pass@www.paypal.com/invoice",
    "https://paypal.com@evil.com/",
    "https://evilexamplepaypal.com/invoice",
    "https://paypal.com.evil.com/invoice",
    "https://www.paypal.com.evil.com/",
    "https://notpaypal.com/",
    "https://paypal.me.evil.com/name",
    "https://www.paypal.me.evil.com/",
    "https://sandbox.paypal.com/invoice",
    "https://www.sandbox.paypal.com/invoice",
    "https://invoice.paypal.com/pay",
    "https://paypal.com:8080/invoice",
    "https://paypal.com:80/",
    "https://paypal.com:4433/",
    "https://paypal.com:/invoice",
    "https://127.0.0.1/",
    "https://127.0.0.1:443/invoice",
    "https://8.8.8.8/",
    "https://2130706433/",
    "https://[::1]/",
    "https://[::1]:443/",
    "https://[2001:db8::1]/invoice",
    "https://paypal.com.",
    "https://paypal.com./invoice",
    "ftp://paypal.com/invoice",
    "https://evil.com/paypal.com",
    "https://paypal.com/a b",
    "https://paypal.com\\@evil.com",
    "https://pаypal.com/invoice",
  ];
  for (const url of rejected) {
    assert.throws(() => normalizePaymentUrl(url), PaymentUrlError, url);
  }
});

test("allows 2000 characters and rejects 2001", () => {
  const base = "https://paypal.com/";
  const ok = base + "a".repeat(2000 - base.length);
  assert.equal(ok.length, 2000);
  assert.equal(normalizePaymentUrl(ok), ok);
  assert.throws(() => normalizePaymentUrl(ok + "a"), (err: unknown) => err instanceof PaymentUrlError && err.message.includes("too long"));
});

test("client payment states use the stored price and never both buttons", () => {
  const linked = clientPaymentView({
    status: "awaiting_payment",
    paymentUrl: "https://www.paypal.com/invoice?amount=1.00",
    finalPrice: "250.00",
    checkoutAvailable: true,
  });
  assert.equal(linked.kind, "link");
  if (linked.kind === "link") {
    assert.equal(linked.href, "https://www.paypal.com/invoice?amount=1.00");
    assert.equal(linked.label, `Pay ${formatUSD(250)} with PayPal`);
    assert.equal(linked.label.includes("1.00") || linked.label.includes("$1"), false);
  }

  assert.equal(
    clientPaymentView({
      status: "awaiting_payment",
      paymentUrl: null,
      finalPrice: 80,
      checkoutAvailable: true,
    }).kind,
    "checkout",
  );
  assert.equal(
    clientPaymentView({
      status: "awaiting_payment",
      paymentUrl: "   ",
      finalPrice: 80,
      checkoutAvailable: false,
    }).kind,
    "waiting",
  );
  for (const status of ["pending", "in_progress", "delivered", "completed", "declined", "cancelled"]) {
    assert.equal(
      clientPaymentView({
        status,
        paymentUrl: invoice,
        finalPrice: 80,
        checkoutAvailable: false,
      }).kind,
      "none",
      status,
    );
  }
  assert.equal(payWithPaypalLabel(null), "Pay with PayPal");
  assert.equal(
    clientPaymentView({
      status: "awaiting_payment",
      paymentUrl: "http://paypal.com/phish",
      finalPrice: 80,
      checkoutAvailable: false,
    }).kind,
    "waiting",
  );
});

test("payment markup is the link, the waiting note, or checkout — one at a time", () => {
  const linkHtml = renderToStaticMarkup(
    createElement(RequestPayment, {
      view: { kind: "link", href: "https://paypal.me/MJFird", label: "Pay $80 with PayPal" },
      checkout: createElement("div", { id: "built-in-checkout" }),
    }),
  );
  assert.match(linkHtml, /href="https:\/\/paypal\.me\/MJFird"/);
  assert.match(linkHtml, /target="_blank"/);
  assert.match(linkHtml, /rel="noopener noreferrer"/);
  assert.match(linkHtml, /Pay \$80 with PayPal/);
  assert.equal(linkHtml.includes("built-in-checkout"), false);
  assert.equal(linkHtml.includes("Payment via PayPal is coming here shortly"), false);

  const waitingHtml = renderToStaticMarkup(
    createElement(RequestPayment, {
      view: { kind: "waiting" },
      checkout: createElement("div", { id: "built-in-checkout" }),
    }),
  );
  assert.equal(waitingHtml.includes("Payment via PayPal is coming here shortly"), true);
  assert.equal(waitingHtml.includes("message you with the payment link"), true);
  assert.equal(waitingHtml.includes("<a "), false);
  assert.equal(waitingHtml.includes("built-in-checkout"), false);

  const checkoutHtml = renderToStaticMarkup(
    createElement(RequestPayment, {
      view: { kind: "checkout" },
      checkout: createElement("div", { id: "built-in-checkout" }),
    }),
  );
  assert.match(checkoutHtml, /id="built-in-checkout"/);
  assert.equal(checkoutHtml.includes("<a "), false);

  const idleHtml = renderToStaticMarkup(createElement(RequestPayment, { view: { kind: "none" } }));
  assert.equal(idleHtml, "");
});

test("emails link to the request page and leave out the PayPal URL", () => {
  const url = "https://www.paypal.com/invoice/payerView/details/INV2-SECRET";
  const acceptedInput = {
    contactName: "Avery",
    serviceTitle: "Poster",
    packageName: "Standard",
    ref: 1001,
    priceLabel: formatUSD(80),
    note: "",
    requestId: "req-1",
  };
  const accepted = acceptEmailCopy({ ...acceptedInput, paymentReady: true });
  const without = acceptEmailCopy({ ...acceptedInput, paymentReady: false });
  const ready = paymentReadyEmailCopy({
    contactName: "Avery",
    serviceTitle: "Poster",
    ref: 1001,
    priceLabel: formatUSD(80),
    requestId: "req-1",
  });

  for (const mail of [accepted, ready]) {
    const text = [mail.subject, ...mail.lines, mail.cta.path, mail.cta.label].join("\n");
    assert.equal(text.includes(url), false);
    assert.equal(text.includes("paypal.com"), false);
    assert.equal(text.includes("paypal.me"), false);
    assert.equal(text.includes("http"), false);
    assert.equal(mail.cta.path, "/account/requests/req-1");
  }
  assert.equal(accepted.lines.some((line) => line.includes("Pay with PayPal")), true);
  assert.equal(without.lines.some((line) => line.includes("Pay with PayPal")), false);
  assert.equal(without.subject, accepted.subject);
});

test("database payment errors map to a short message", () => {
  assert.match(paymentWriteMessage("payment_url_invalid") ?? "", /paypal\.com/);
  assert.match(paymentWriteMessage("payment_url_too_long") ?? "", /too long/);
  assert.match(paymentWriteMessage("payment_url_status") ?? "", /awaiting payment/);
  assert.match(paymentWriteMessage('column "payment_url" does not exist') ?? "", /database update/);
  assert.equal(paymentWriteMessage("permission denied for table commission_requests"), null);
});
