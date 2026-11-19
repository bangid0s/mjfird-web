import type { CommissionRequestRow, CommissionStatus } from "@/lib/supabase/types";
import { STATUS_FLOW, priceOf } from "@/lib/commissions/status";
import { formatUSD } from "@/lib/services/storefront";

/*
  What the client should do next on a request, in plain words. The account
  overview collects every request whose step is the client's ("yours") into
  one "Needs you" block; the request page leads with the same step.
*/

export type NextStep = {
  /** "yours": the client has to act. "ours": waiting on the artist. "done": nothing left. */
  owner: "yours" | "ours" | "done";
  title: string;
  body: string;
  /** In-page anchor or URL for the primary action, if there is one. */
  action?: { label: string; href: string };
};

type Input = Pick<CommissionRequestRow, "status" | "final_price" | "estimated_total" | "payment_url"> & {
  hasReview: boolean;
  /** True when PayPal checkout or a pay link is actually ready to use. */
  canPay: boolean;
};

export function nextStep(req: Input): NextStep {
  switch (req.status) {
    case "pending":
      return {
        owner: "ours",
        title: "Waiting for review",
        body: "I'll read your brief and reply here with a final price. Add anything you forgot in the messages.",
        action: { label: "Add details", href: "#messages" },
      };
    case "awaiting_payment":
      return req.canPay
        ? {
            owner: "yours",
            title: `Pay ${formatUSD(priceOf(req))} to start`,
            body: "Your request is accepted. Work starts as soon as the payment comes through.",
            action: { label: "Pay now", href: "#payment" },
          }
        : {
            owner: "ours",
            title: "Accepted. Payment link on its way",
            body: "Your request is accepted. I'll add the payment link here shortly.",
          };
    case "in_progress":
      return {
        owner: "ours",
        title: "Work in progress",
        body: "Sketches, questions and updates will show up in the messages.",
        action: { label: "Open messages", href: "#messages" },
      };
    case "delivered":
      return {
        owner: "yours",
        title: "Your files are ready",
        body: "Download them and check everything. If something needs a tweak, say so in the messages.",
        action: { label: "View files", href: "#files" },
      };
    case "completed":
      return req.hasReview
        ? { owner: "done", title: "Completed", body: "Thank you for the commission and the review." }
        : {
            owner: "yours",
            title: "How did it go?",
            body: "A short review helps other clients decide. It takes a minute.",
            action: { label: "Write a review", href: "#review" },
          };
    case "declined":
      return { owner: "done", title: "Not taken on", body: "This request wasn't a fit this time. The note explains why." };
    case "cancelled":
      return { owner: "done", title: "Cancelled", body: "This request was cancelled." };
  }
}

/** Open requests first (newest first), then finished ones. */
export function isFinished(status: CommissionStatus) {
  return status === "completed" || status === "declined" || status === "cancelled";
}

/** 0-based position on the happy path, or -1 when the request left it. */
export function stepIndex(status: CommissionStatus) {
  return STATUS_FLOW.indexOf(status);
}
