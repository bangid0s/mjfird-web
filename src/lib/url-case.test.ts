import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalSlug, lowercaseRedirectPath } from "./url-case";

test("mixed-case content paths go to their lowercase address", () => {
  assert.equal(lowercaseRedirectPath("/work/AshOakriver"), "/work/ashoakriver");
  assert.equal(lowercaseRedirectPath("/blog/FLEX"), "/blog/flex");
  assert.equal(lowercaseRedirectPath("/work/HazielLastlight-mtgproxy"), "/work/haziellastlight-mtgproxy");
  assert.equal(lowercaseRedirectPath("/Work/Goliath"), "/work/goliath");
});

test("lowercase paths and non-content paths are left alone", () => {
  assert.equal(lowercaseRedirectPath("/work/goliath"), null);
  assert.equal(lowercaseRedirectPath("/work"), null);
  assert.equal(lowercaseRedirectPath("/auth/callback"), null);
  assert.equal(lowercaseRedirectPath("/admin/Projects"), null);
  assert.equal(lowercaseRedirectPath("/account/requests/ABC"), null);
});

test("slugs are compared lowercase", () => {
  assert.equal(canonicalSlug(" Semarang-IP-FEST-2026 "), "semarang-ip-fest-2026");
});
