import { track as vercelTrack } from "@vercel/analytics";

/*
  The order funnel, in GA4's recommended event names so its built-in funnel
  and conversion reports work without setup:

    view_item       a service page is opened
    begin_checkout  the request form is opened
    generate_lead   a request (or a contact inquiry) is sent
    purchase        a PayPal payment is captured
    select_item     "Order similar" on a gallery piece
    join_waitlist   "Notify me when slots open"

  Each event also goes to Vercel Analytics (custom events show there on paid
  plans; on Hobby the call is simply ignored). Never throws: tracking must not
  break a page, and ad blockers often remove both scripts.
*/

export type TrackEvent =
  | "view_item"
  | "begin_checkout"
  | "generate_lead"
  | "purchase"
  | "select_item"
  | "join_waitlist";

export type TrackParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: "event", name: string, params?: Record<string, unknown>) => void;
  }
}

/** Drops empty values; GA4 and Vercel both reject undefined. */
export function cleanParams(params: TrackParams = {}): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "")) as Record<
    string,
    string | number | boolean
  >;
}

export function trackEvent(name: TrackEvent, params?: TrackParams) {
  if (typeof window === "undefined") return;
  const clean = cleanParams(params);
  try {
    window.gtag?.("event", name, clean);
  } catch {
    // tracking is best-effort
  }
  try {
    vercelTrack(name, clean);
  } catch {
    // tracking is best-effort
  }
}
