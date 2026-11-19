import assert from "node:assert/strict";
import test from "node:test";
import { QUOTE_PACKAGE_ID, awaitingQuote, isQuoteRequest, priceLabel } from "./quote";

test("a custom quote is recognised by its package id", () => {
  assert.equal(isQuoteRequest({ package_id: QUOTE_PACKAGE_ID }), true);
  assert.equal(isQuoteRequest({ package_id: "bust" }), false);
  assert.equal(isQuoteRequest({}), false);
});

test("a quote shows 'Quote pending' until the artist prices it", () => {
  const quote = { package_id: QUOTE_PACKAGE_ID, final_price: null, estimated_total: 0 };
  assert.equal(awaitingQuote(quote), true);
  assert.equal(priceLabel(quote), "Quote pending");
  const priced = { ...quote, final_price: "250.00" };
  assert.equal(awaitingQuote(priced), false);
  assert.match(priceLabel(priced), /250/);
});

test("a priced order always shows its amount", () => {
  assert.match(priceLabel({ package_id: "bust", final_price: null, estimated_total: "80" }), /80/);
});
