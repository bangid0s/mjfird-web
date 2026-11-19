import { priceOf, toNumber } from "@/lib/commissions/status";
import { formatUSD } from "@/lib/services/storefront";

/*
  Custom quotes: a commission request for a service with no fixed packages
  (e.g. custom illustration). It goes through the same request flow as a
  priced order, so it's tracked, messaged and paid like any commission, but
  it starts at $0 and the artist sets the price when accepting.

  The mark is the package id the database writes (migration 0049), so no
  extra column is needed and older rows are never misread as quotes.
*/
export const QUOTE_PACKAGE_ID = "custom-quote";

export function isQuoteRequest(row: { package_id?: string | null }) {
  return row.package_id === QUOTE_PACKAGE_ID;
}

/** True while a custom quote is still waiting for the artist's price. */
export function awaitingQuote(row: { package_id?: string | null; final_price: number | string | null }) {
  return isQuoteRequest(row) && toNumber(row.final_price) === null;
}

/** The price to show: "Quote pending" until a custom quote is priced. */
export function priceLabel(row: {
  package_id?: string | null;
  final_price: number | string | null;
  estimated_total: number | string;
}) {
  return awaitingQuote(row) ? "Quote pending" : formatUSD(priceOf(row));
}
