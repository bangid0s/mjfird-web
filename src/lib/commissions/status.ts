import type { CommissionStatus } from "@/lib/supabase/types";

export const STATUS_LABEL: Record<CommissionStatus, string> = {
  pending: "Pending review",
  awaiting_payment: "Accepted — awaiting payment",
  in_progress: "In progress",
  delivered: "Delivered",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

/** Short label for chips and filters. */
export const STATUS_SHORT: Record<CommissionStatus, string> = {
  pending: "Pending",
  awaiting_payment: "Awaiting payment",
  in_progress: "In progress",
  delivered: "Delivered",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

export const STATUS_HINT: Record<CommissionStatus, string> = {
  pending: "Your request is in the queue. You'll get an email once it's reviewed.",
  awaiting_payment: "Your request was accepted. Payment opens here — work starts once it's paid.",
  in_progress: "Work is underway. Updates and questions will appear in the thread below.",
  delivered: "Your files are ready below. Let me know if anything needs a tweak.",
  completed: "All done — thank you for commissioning!",
  declined: "This request wasn't a fit this time. See the note below.",
  cancelled: "This request was cancelled.",
};

/** The happy path, used for the progress timeline. */
export const STATUS_FLOW: CommissionStatus[] = ["pending", "awaiting_payment", "in_progress", "delivered", "completed"];

export const OPEN_STATUSES: CommissionStatus[] = ["pending", "awaiting_payment", "in_progress", "delivered"];

export function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** What the client owes: the artist's final price once set, else the estimate. */
export function priceOf(row: { final_price: number | string | null; estimated_total: number | string }) {
  return toNumber(row.final_price) ?? toNumber(row.estimated_total) ?? 0;
}

const RPC_ERRORS: Record<string, string> = {
  not_signed_in: "Please sign in first.",
  service_not_found: "That service isn't available anymore.",
  service_closed: "This service is closed for new requests right now.",
  package_not_found: "Please pick a package.",
  invalid_name: "Please enter your name.",
  invalid_brief: "Please describe what you'd like (at least a sentence).",
  invalid_answers: "Some answers couldn't be read. Please try again.",
  too_many_files: "That's a lot of files — 20 at most.",
  invalid_file: "One of the uploaded files couldn't be attached. Please re-upload it.",
  too_many_pending: "You already have 5 requests waiting for review. Please wait for a reply first.",
  request_not_found: "Request not found.",
  cannot_cancel: "This request can't be cancelled anymore — send a message instead.",
  capture_in_progress: "PayPal checkout is in progress. Refresh to confirm before changing this request.",
  capture_recorded: "PayPal already captured this payment.",
  review_not_open: "Reviews open once the commission is marked completed.",
  invalid_rating: "Please pick a rating from 1 to 5 stars.",
  invalid_review: "Please write a few words (10 to 1,000 characters).",
  invalid_role: "Role or company is too long (80 characters max).",
};

export function manualAdvanceConflict(message: string) {
  if (message.includes("capture_recorded")) return "PayPal already captured this payment.";
  if (message.includes("capture_in_progress")) return "PayPal checkout is in progress. Refresh to confirm before changing this request.";
  return "This request changed. Refresh and try again.";
}

/** How an admin write behaves when the PayPal functions are missing. */
export function manualWritePlan(input: {
  rpcMissing: boolean;
  checkoutTable: "absent" | "present" | "unknown";
  paypalEnabled: boolean;
}): "legacy" | "rpc" | "fail_closed" {
  if (!input.rpcMissing) return "rpc";
  if (input.checkoutTable === "absent" && !input.paypalEnabled) return "legacy";
  return "fail_closed";
}

export function friendlyRpcError(message: string) {
  for (const [code, text] of Object.entries(RPC_ERRORS)) {
    if (message.includes(code)) return text;
  }
  return "Something went wrong. Please try again.";
}
