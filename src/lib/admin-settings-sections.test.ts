import assert from "node:assert/strict";
import test from "node:test";
import {
  SETTINGS_SECTIONS,
  buildSettingsPayload,
  isSettingsSection,
  sectionPayload,
  type SettingsSection,
} from "@/lib/admin/site-settings-sections";

const sections = Object.keys(SETTINGS_SECTIONS) as SettingsSection[];
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

test("sections: every editable column belongs to exactly one screen", () => {
  const all = Object.keys(buildSettingsPayload(new FormData())).sort();
  const claimed = sections.flatMap((section) => SETTINGS_SECTIONS[section].columns as string[]);
  assert.deepEqual([...claimed].sort(), all, "no column is orphaned or invented");
  assert.equal(new Set(claimed).size, claimed.length, "no column is saved by two screens");
});

test("sections: saving one screen writes only that screen's columns", () => {
  for (const section of sections) {
    const payload = sectionPayload(section, new FormData());
    assert.deepEqual(Object.keys(payload).sort(), [...SETTINGS_SECTIONS[section].columns].sort(), section);
  }
});

test("sections: a Dance save cannot blank the homepage, the brand or the retainer", () => {
  const payload = sectionPayload(
    "dance",
    form({ dance_section_eyebrow: "Dance", dance_section_title: "The other half", dance_intro: "Reel and battles." }),
  );
  assert.deepEqual(payload, {
    dance_section_eyebrow: "Dance",
    dance_section_title: "The other half",
    dance_intro: "Reel and battles.",
  });
  for (const column of ["hero_headline", "stats", "accent_color", "logo_text", "retainer_enabled", "nav_links"]) {
    assert.equal(column in payload, false, column);
  }
});

test("sections: rows posted as pipe-separated lines still parse", () => {
  const home = sectionPayload("home", form({ stats: "15|+|Years as an artist\n796|+|Clients worldwide\n|| " }));
  assert.deepEqual(home.stats, [
    { value: 15, suffix: "+", label: "Years as an artist" },
    { value: 796, suffix: "+", label: "Clients worldwide" },
  ]);
  const services = sectionPayload(
    "services",
    form({ process_steps: "Brief|We agree the goal.", services_faq: "How do I pay?|PayPal, in USD.", retainer_enabled: "on" }),
  );
  assert.deepEqual(services.process_steps, [{ title: "Brief", description: "We agree the goal." }]);
  assert.deepEqual(services.services_faq, [{ q: "How do I pay?", a: "PayPal, in USD." }]);
  assert.equal(services.retainer_enabled, true);
  const site = sectionPayload("site", form({ nav_links: "Work|/work\nBad|https://elsewhere.example" }));
  assert.deepEqual(site.nav_links, [{ label: "Work", href: "/work" }]);
});

test("sections: only known section names are accepted", () => {
  assert.equal(isSettingsSection("home"), true);
  assert.equal(isSettingsSection("links-background"), true);
  assert.equal(isSettingsSection("constructor"), false);
  assert.equal(isSettingsSection(undefined), false);
});
