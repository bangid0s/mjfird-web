import assert from "node:assert/strict";
import test from "node:test";
import { isBrokenImage } from "@/lib/media";
import { partitionNavLinks } from "@/lib/nav-links";
import { normalizeProcessStep } from "@/lib/process-steps";
import { formatStat } from "@/lib/stats";
import { splitTimeline } from "@/lib/timeline";
import { OVERHAUL_COLUMNS, parseFaq, withoutOverhaulColumns } from "@/lib/admin/site-settings-columns";
import { BUDGETS, PROJECT_TYPES, inquiryPreselect, validateInquiry } from "@/lib/inquiry-options";

const link = (label: string, href: string) => ({ label, href });

test("nav: first five links go in the bar (Contact included), the rest overflow", () => {
  const links = ["a", "b", "c", "d", "e"].map((x) => link(x, `/${x}`));
  links.splice(2, 0, link("Contact", "/contact"));
  const { primary, overflow } = partitionNavLinks(links);
  assert.deepEqual(primary.map((l) => l.href), ["/a", "/b", "/contact", "/c", "/d"]);
  assert.deepEqual(overflow.map((l) => l.href), ["/e"]);
});

test("nav: short lists, duplicates and a missing contact link are all fine", () => {
  assert.deepEqual(partitionNavLinks([]), { primary: [], overflow: [] });
  const dup = partitionNavLinks([link("Work", "/work"), link("Work again", "/work"), link("About", "/about")]);
  assert.deepEqual(dup.primary.map((l) => l.label), ["Work", "About"]);
  assert.deepEqual(dup.overflow, []);
});

test("process: a sentence typed into the title is split at the first dash", () => {
  assert.deepEqual(
    normalizeProcessStep({ title: "Brief — We lock the goal — so we agree.", description: "" }),
    { title: "Brief", description: "We lock the goal — so we agree." },
  );
});

test("process: well-formed steps and dash-less titles are untouched", () => {
  const ok = { title: "Build — phase two", description: "Line work." };
  assert.deepEqual(normalizeProcessStep(ok), ok);
  assert.deepEqual(normalizeProcessStep({ title: "Launch", description: "" }), { title: "Launch", description: "" });
  assert.deepEqual(normalizeProcessStep({ title: " — orphan", description: "" }), { title: " — orphan", description: "" });
});

test("stats: thousands are grouped and the suffix is kept", () => {
  assert.equal(formatStat({ value: 1988, suffix: "+" }), "1,988+");
  assert.equal(formatStat({ value: 96, suffix: "%" }), "96%");
  assert.equal(formatStat({ value: 9, suffix: "" }), "9");
});

test("timeline: ascending input is shown newest first and split at six", () => {
  const items = ["2014", "2015", "2020", "2021", "2021", "2023", "2024", "2026"].map((year, i) => ({ year, id: i }));
  const { recent, older } = splitTimeline(items);
  assert.deepEqual(recent.map((t) => t.id), [7, 6, 5, 4, 3, 2]);
  assert.deepEqual(older.map((t) => t.id), [1, 0]);
});

test("timeline: descending or unreadable years keep the given order, nothing is dropped", () => {
  const desc = [{ year: "2026" }, { year: "2020" }];
  assert.deepEqual(splitTimeline(desc).recent, desc);
  const odd = [{ year: "Now" }, { year: "2021" }, { year: "2021" }];
  const out = splitTimeline(odd, 2);
  assert.equal(out.recent.length + out.older.length, 3);
  assert.deepEqual(out.recent, odd.slice(0, 2));
});

test("inquiry: retainer preselects both selects; anything else preselects nothing", () => {
  assert.deepEqual(inquiryPreselect("retainer"), { projectType: "retainer", budget: "retainer" });
  for (const bad of [undefined, "", "nope", ["retainer"], 5]) {
    assert.deepEqual(inquiryPreselect(bad), { projectType: "", budget: "" });
  }
  assert.ok(PROJECT_TYPES.some((o) => o.value === "retainer"));
  assert.ok(BUDGETS.some((o) => o.value === "retainer"));
});

test("settings: the fallback payload drops only the 0034 columns", () => {
  const payload = { site_title: "x", hero_headline: "h", retainer_points: ["a"], services_faq: [] };
  assert.deepEqual(withoutOverhaulColumns(payload), { site_title: "x" });
  assert.equal(OVERHAUL_COLUMNS.length, 10);
});

test("settings: FAQ lines are Question|Answer, blanks and half-lines are skipped", () => {
  assert.deepEqual(parseFaq("Do you do rush work?|Yes | for a fee.\n\nNo answer here\n|No question"), [
    { q: "Do you do rush work?", a: "Yes | for a fee." },
  ]);
});

test("inquiry: an untouched dropdown gets a readable message, not a type error", () => {
  // A select left on its disabled placeholder is absent from FormData entirely.
  const result = validateInquiry({ name: "A", email: "a@b.co", message: "Twenty characters of brief." });
  assert.equal(result.ok, false);
  assert.deepEqual(result.ok ? {} : result.errors, {
    projectType: "Pick what this is about.",
    budget: "Pick a rough budget range.",
  });
});

test("inquiry: a complete form validates and keeps its values", () => {
  const values = { name: "A", email: "a@b.co", projectType: "retainer", budget: "retainer", message: "Twenty characters of brief." };
  const result = validateInquiry(values);
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok && result.data, { ...values, company: "" });
});

test("avatar: an image that finished loading with no pixels counts as broken", () => {
  // The state of an <img> whose request failed before React attached its
  // error listener: complete, but with no natural size.
  assert.equal(isBrokenImage({ complete: true, naturalWidth: 0 }), true);
  assert.equal(isBrokenImage({ complete: true, naturalWidth: 96 }), false);
  assert.equal(isBrokenImage({ complete: false, naturalWidth: 0 }), false);
  assert.equal(isBrokenImage(null), false);
});
