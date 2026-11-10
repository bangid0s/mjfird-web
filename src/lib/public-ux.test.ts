import assert from "node:assert/strict";
import test from "node:test";
import { partitionNavLinks } from "@/lib/nav-links";
import { normalizeProcessStep } from "@/lib/process-steps";
import { formatStat } from "@/lib/stats";
import { splitTimeline } from "@/lib/timeline";
import { OVERHAUL_COLUMNS, parseFaq, withoutOverhaulColumns } from "@/lib/admin/site-settings-columns";
import { BUDGETS, PROJECT_TYPES, inquiryPreselect } from "@/lib/inquiry-options";

const link = (label: string, href: string) => ({ label, href });

test("nav: first five non-contact links go in the bar, the rest overflow", () => {
  const links = ["a", "b", "c", "d", "e", "f"].map((x) => link(x, `/${x}`));
  links.splice(2, 0, link("Contact", "/contact"));
  const { primary, overflow } = partitionNavLinks(links);
  assert.deepEqual(primary.map((l) => l.href), ["/a", "/b", "/c", "/d", "/e"]);
  assert.deepEqual(overflow.map((l) => l.href), ["/f"]);
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
