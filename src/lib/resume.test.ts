import assert from "node:assert/strict";
import test from "node:test";
import {
  calmCaps,
  currentEntry,
  isCurrentPeriod,
  sortNewestFirst,
  spanLabel,
  splitEducation,
  splitRecent,
  yearsOfPractice,
} from "@/lib/resume";

const NOW = 2026;
const e = (role: string, period: string) => ({ role, period });

// The order the live resume was typed in: oldest first.
const career = [
  e("Graphic Designer", "2013-2014"),
  e("Webmaster", "2014-2018"),
  e("Top Rated Seller", "2015-2021"),
  e("Community Manager", "2021-2022"),
  e("Creator Ambassador", "2025"),
  e("Lead Digital Illustrator", "2025"),
  e("Dojo Designer", "2021-2025"),
  e("Lead Graphic Designer", "2021-2026"),
];

test("current: words, or a range that hasn't ended; a lone year is a dated gig", () => {
  assert.equal(isCurrentPeriod("Mar 2021 – Present", NOW), true);
  assert.equal(isCurrentPeriod("2021 - sekarang", NOW), true);
  assert.equal(isCurrentPeriod("2021-2026", NOW), true);
  assert.equal(isCurrentPeriod("2021-2025", NOW), false);
  assert.equal(isCurrentPeriod("2026", NOW), false);
  assert.equal(isCurrentPeriod("", NOW), false);
});

test("sort: open role first, then by end year, longer engagement first on a tie", () => {
  assert.deepEqual(
    sortNewestFirst(career, NOW).map((x) => x.role),
    [
      "Lead Graphic Designer",
      "Dojo Designer",
      "Creator Ambassador",
      "Lead Digital Illustrator",
      "Community Manager",
      "Top Rated Seller",
      "Webmaster",
      "Graphic Designer",
    ],
  );
});

test("sort: undated entries keep their order after the dated ones; input is not mutated", () => {
  const input = [e("a", ""), e("b", "2020"), e("c", "soon"), e("d", "2022")];
  assert.deepEqual(sortNewestFirst(input, NOW).map((x) => x.role), ["d", "b", "a", "c"]);
  assert.deepEqual(input.map((x) => x.role), ["a", "b", "c", "d"]);
  assert.deepEqual(sortNewestFirst([e("x", ""), e("y", "")], NOW).map((x) => x.role), ["x", "y"]);
});

test("currently: the open role, not whichever row was typed first", () => {
  const sorted = sortNewestFirst(career, NOW);
  assert.equal(currentEntry(sorted, NOW)?.role, "Lead Graphic Designer");
  assert.equal(currentEntry(sortNewestFirst([e("old", "2010-2012")], NOW), NOW), null);
});

test("span and years of practice count an open role up to this year", () => {
  assert.equal(spanLabel("2021 — Present", NOW), "5 yrs");
  assert.equal(spanLabel("2013-2014", NOW), "1 yr");
  assert.equal(spanLabel("2025", NOW), null);
  assert.equal(spanLabel("freelance", NOW), null);
  assert.equal(yearsOfPractice(career, NOW), 13);
  assert.equal(yearsOfPractice([e("x", "")], NOW), null);
});

test("fold: roles that ended in the last three years stay in full, within 3 and 6", () => {
  const { recent, earlier } = splitRecent(sortNewestFirst(career, NOW), NOW);
  assert.deepEqual(recent.map((x) => x.role), [
    "Lead Graphic Designer",
    "Dojo Designer",
    "Creator Ambassador",
    "Lead Digital Illustrator",
  ]);
  assert.equal(earlier.length, 4);

  const old = sortNewestFirst([e("a", "2001"), e("b", "2002"), e("c", "2003"), e("d", "2004"), e("f", "2005")], NOW);
  assert.equal(splitRecent(old, NOW).recent.length, 3);

  const busy = Array.from({ length: 9 }, (_, i) => e(`g${i}`, "2025"));
  assert.equal(splitRecent(busy, NOW).recent.length, 6);
});

test("fold: a single leftover row is shown rather than folded alone", () => {
  const four = sortNewestFirst([e("a", "2001"), e("b", "2002"), e("c", "2003"), e("d", "2004")], NOW);
  assert.deepEqual(splitRecent(four, NOW), { recent: four, earlier: [] });
  assert.deepEqual(splitRecent([], NOW), { recent: [], earlier: [] });
});

test("education: the top qualification stands, schools fold once there are three rows", () => {
  assert.deepEqual(splitEducation(["msc", "bsc"]), { recent: ["msc", "bsc"], earlier: [] });
  assert.deepEqual(splitEducation(["uni", "sma", "smp", "sd"]), { recent: ["uni"], earlier: ["sma", "smp", "sd"] });
});

test("caps: a shouted title is calmed, acronyms and mixed case are left alone", () => {
  assert.equal(calmCaps("INFORMATION TECHNOLOGY OF DIGITAL MULTIMEDIA"), "Information Technology of Digital Multimedia");
  assert.equal(calmCaps("MJFIRD"), "MJFIRD");
  assert.equal(calmCaps("UI/UX LEAD"), "UI/UX LEAD");
  assert.equal(calmCaps("Lead Graphic Designer"), "Lead Graphic Designer");
});
