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

test("hero button destinations: paths, links, mailto; unsafe ones dropped", async () => {
  const { normalizeHeroHref, heroCtaHref } = await import("@/lib/hero-cta");
  assert.equal(normalizeHeroHref("/services"), "/services");
  assert.equal(normalizeHeroHref(" services "), "/services");
  assert.equal(normalizeHeroHref("work/my-project"), "/work/my-project");
  assert.equal(normalizeHeroHref("#faq"), "#faq");
  assert.equal(normalizeHeroHref("https://vgen.co/mjfird"), "https://vgen.co/mjfird");
  assert.equal(normalizeHeroHref("www.artstation.com/mjfird"), "https://www.artstation.com/mjfird");
  assert.equal(normalizeHeroHref("mailto:hi@example.com"), "mailto:hi@example.com");
  for (const bad of ["javascript:alert(1)", "//evil.com", "data:text/html,x", "a b", "http://localhost"]) {
    assert.equal(normalizeHeroHref(bad), "", bad);
  }
  assert.equal(heroCtaHref("", "/work"), "/work");
  assert.equal(heroCtaHref("javascript:alert(1)", "/work"), "/work");
  assert.equal(heroCtaHref("/contact", "/work"), "/contact");
});
