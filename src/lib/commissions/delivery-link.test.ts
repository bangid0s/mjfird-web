import assert from "node:assert/strict";
import test from "node:test";
import { DeliveryUrlError, deliveryHost, normalizeDeliveryUrl, safeDeliveryUrl } from "@/lib/commissions/delivery-link";

test("accepts common file-drop links", () => {
  const drive = "https://drive.google.com/drive/folders/1AbC_dEf?usp=sharing";
  assert.equal(normalizeDeliveryUrl(drive), drive);
  assert.equal(normalizeDeliveryUrl("  https://www.dropbox.com/scl/fo/abc?dl=0  "), "https://www.dropbox.com/scl/fo/abc?dl=0");
  assert.equal(normalizeDeliveryUrl("https://we.tl/t-XyZ"), "https://we.tl/t-XyZ");
  assert.equal(normalizeDeliveryUrl("HTTPS://Mega.NZ/folder/x#key"), "https://mega.nz/folder/x#key");
});

test("empty means cleared", () => {
  assert.equal(normalizeDeliveryUrl(""), null);
  assert.equal(normalizeDeliveryUrl("   "), null);
  assert.equal(normalizeDeliveryUrl(null), null);
});

test("rejects anything that isn't a public https link", () => {
  for (const bad of [
    "http://drive.google.com/x",
    "drive.google.com/x",
    "//drive.google.com/x",
    "javascript:alert(1)",
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://[::1]/x",
    "https://user:pass@example.com/x",
    "https://exa mple.com/x",
    "https://example.com/\u0000",
    "https://еxample.com/x", // Cyrillic е
    `https://example.com/${"a".repeat(2001)}`,
  ]) {
    assert.throws(() => normalizeDeliveryUrl(bad), DeliveryUrlError, bad);
  }
});

test("safe read and host caption", () => {
  assert.equal(safeDeliveryUrl("javascript:alert(1)"), null);
  assert.equal(deliveryHost("https://www.dropbox.com/scl/fo/abc"), "dropbox.com");
  assert.equal(deliveryHost("https://drive.google.com/x"), "drive.google.com");
});
