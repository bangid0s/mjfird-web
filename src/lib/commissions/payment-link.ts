import { toNumber } from "@/lib/commissions/status";
import { formatUSD } from "@/lib/services/storefront";

/*
  PayPal invoice / PayPal.me links. Keep this in lockstep with
  commission_payment_url_normalize in supabase/migrations/0032_commission_payment_url.sql.
  USD only: the amount on the button is the stored final_price, never a query param.
*/

const MAX_LENGTH = 2000;
const HOSTS = new Set(["paypal.com", "www.paypal.com", "paypal.me", "www.paypal.me"]);

export class PaymentUrlError extends Error {
  constructor(message = "Use an https link on paypal.com or paypal.me.") {
    super(message);
    this.name = "PaymentUrlError";
  }
}

/** Canonical https URL, or null when the field is empty. Throws on a rejected link. */
export function normalizePaymentUrl(input: string | null | undefined): string | null {
  if (input == null) return null;
  const raw = input.trim();
  if (raw === "") return null;
  if (raw.length > MAX_LENGTH) throw new PaymentUrlError("That payment link is too long.");
  if (!/^[\x21-\x7E]+$/.test(raw) || raw.includes("\\")) throw new PaymentUrlError();
  if (raw.startsWith("//") || raw.toLowerCase().slice(0, 8) !== "https://") throw new PaymentUrlError();

  const rest = raw.slice(8);
  if (rest === "") throw new PaymentUrlError();

  const slash = rest.indexOf("/");
  const query = rest.indexOf("?");
  const hash = rest.indexOf("#");
  let cut = rest.length;
  for (const at of [slash, query, hash]) {
    if (at !== -1 && at < cut) cut = at;
  }
  const authority = rest.slice(0, cut);
  const tail = rest.slice(cut);
  if (authority === "" || authority.includes("@") || authority.startsWith("[")) throw new PaymentUrlError();

  let host = authority;
  const colon = authority.lastIndexOf(":");
  if (colon !== -1) {
    host = authority.slice(0, colon);
    const port = authority.slice(colon + 1);
    if (port !== "443" || host === "" || host.includes(":")) throw new PaymentUrlError();
  }

  host = host.toLowerCase();
  if (/^[0-9]+(\.[0-9]+){0,3}$/.test(host)) throw new PaymentUrlError();
  if (!HOSTS.has(host)) throw new PaymentUrlError();
  return `https://${host}${tail}`;
}

/** Stored link if it still passes the allowlist, otherwise nothing to render. */
export function safePaymentUrl(value: string | null | undefined): string | null {
  try {
    return normalizePaymentUrl(value);
  } catch {
    return null;
  }
}

export function payWithPaypalLabel(finalPrice: number | string | null | undefined): string {
  const amount = toNumber(finalPrice);
  if (amount === null) return "Pay with PayPal";
  return `Pay ${formatUSD(amount)} with PayPal`;
}

export type ClientPaymentView =
  | { kind: "link"; href: string; label: string }
  | { kind: "checkout" }
  | { kind: "waiting" }
  | { kind: "none" };

/**
 * Invoice link wins over built-in checkout. A click only opens PayPal;
 * it does not mark the request paid.
 */
export function clientPaymentView(input: {
  status: string;
  paymentUrl: string | null | undefined;
  finalPrice: number | string | null | undefined;
  checkoutAvailable: boolean;
}): ClientPaymentView {
  const href = safePaymentUrl(input.paymentUrl);
  if (input.status === "awaiting_payment" && href) {
    return { kind: "link", href, label: payWithPaypalLabel(input.finalPrice) };
  }
  if (input.checkoutAvailable) return { kind: "checkout" };
  if (input.status === "awaiting_payment") return { kind: "waiting" };
  return { kind: "none" };
}

export function paymentWriteMessage(message: string): string | null {
  if (message.includes("payment_url_too_long")) return "That payment link is too long.";
  if (message.includes("payment_url_invalid")) return "Use an https link on paypal.com or paypal.me.";
  if (message.includes("payment_url_status")) {
    return "The payment link can only be changed while the request is pending or awaiting payment.";
  }
  if (message.includes("not_admin")) return "Only an admin can set the payment link.";
  if (message.includes("set_commission_payment_url") && message.includes("does not exist")) {
    return "Payment links aren't available until the database update is applied.";
  }
  if (message.includes("payment_url") && (message.includes("does not exist") || message.includes("schema cache"))) {
    return "Payment links aren't available until the database update is applied.";
  }
  return null;
}

export function acceptEmailCopy(input: {
  contactName: string;
  serviceTitle: string;
  packageName: string;
  ref: number | string;
  priceLabel: string;
  note: string;
  paymentReady: boolean;
  requestId: string;
}): { subject: string; lines: string[]; cta: { label: string; path: string } } {
  const lines = [
    `Hi ${input.contactName},`,
    `Good news — I've accepted your request for ${input.serviceTitle} — ${input.packageName}.`,
    `Final price: ${input.priceLabel} (USD).`,
  ];
  if (input.paymentReady) {
    lines.push("Your PayPal payment is ready. Open your request and use Pay with PayPal.");
  }
  if (input.note) lines.push(input.note);
  lines.push("Open your request to see the details and next steps.");
  return {
    subject: `Accepted: ${input.serviceTitle} (#${input.ref}) — ${input.priceLabel}`,
    lines,
    cta: { label: "View request", path: `/account/requests/${input.requestId}` },
  };
}

export function paymentReadyEmailCopy(input: {
  contactName: string;
  serviceTitle: string;
  ref: number | string;
  priceLabel: string | null;
  requestId: string;
}): { subject: string; lines: string[]; cta: { label: string; path: string } } {
  const lines = [`Hi ${input.contactName},`, `The PayPal payment for ${input.serviceTitle} is ready.`];
  if (input.priceLabel) lines.push(`Final price: ${input.priceLabel} (USD).`);
  lines.push("Open your request and use Pay with PayPal.");
  const priceSuffix = input.priceLabel ? ` — ${input.priceLabel}` : "";
  return {
    subject: `Payment ready: ${input.serviceTitle} (#${input.ref})${priceSuffix}`,
    lines,
    cta: { label: "View request", path: `/account/requests/${input.requestId}` },
  };
}
