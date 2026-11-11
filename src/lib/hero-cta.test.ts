import assert from "node:assert/strict";
import test from "node:test";
import { HERO_CTA_DEFAULTS, heroCtaLabels } from "@/lib/hero-cta";

test("original default pair is read as the new pair", () => {
  assert.deepEqual(heroCtaLabels("See the work", "Start a project"), HERO_CTA_DEFAULTS);
});

test("custom labels pass through, blanks fall back", () => {
  assert.deepEqual(heroCtaLabels("Book a slot", "Portfolio"), { primary: "Book a slot", secondary: "Portfolio" });
  assert.deepEqual(heroCtaLabels("See the work", "Browse"), { primary: "See the work", secondary: "Browse" });
  assert.deepEqual(heroCtaLabels("", null), HERO_CTA_DEFAULTS);
});
