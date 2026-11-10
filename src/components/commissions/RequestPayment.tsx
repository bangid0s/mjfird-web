import type { ReactNode } from "react";
import type { ClientPaymentView } from "@/lib/commissions/payment-link";

export const PAYMENT_WAITING_COPY =
  "Payment via PayPal is coming here shortly — I'll message you with the payment link.";

/** Pay-link, built-in checkout, or the waiting note. Only one of these renders. */
export function RequestPayment({ view, checkout = null }: { view: ClientPaymentView; checkout?: ReactNode }) {
  if (view.kind === "link") {
    return (
      <div className="flex flex-col gap-2">
        <a
          href={view.href}
          target="_blank"
          rel="noopener noreferrer"
          className="spec inline-flex items-center justify-center bg-accent px-5 py-3 text-center text-accent-ink hover:brightness-110"
        >
          {view.label}
        </a>
        <p className="text-[13px] text-ink-faint">Opens PayPal in a new tab. I&apos;ll mark the order paid once the payment arrives.</p>
      </div>
    );
  }
  if (view.kind === "checkout") return checkout;
  if (view.kind === "waiting") {
    return <p className="border border-accent/40 px-4 py-3 text-body-sm text-ink">{PAYMENT_WAITING_COPY}</p>;
  }
  return null;
}
