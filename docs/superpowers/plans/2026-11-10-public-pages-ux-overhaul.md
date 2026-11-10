# Public Pages UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Home, Work, Services, About, Contact and the shared nav for conversion while keeping the Studio Spec visual identity.

**Architecture:** Small pure helpers in `src/lib` carry every rule that can be wrong (nav split, process-step repair, stat formatting, timeline order, inquiry options) and are unit-tested. Pages stay server components that read `getSiteSettings()`; new interactive pieces are small client components. New settings are optional columns read through `mapRow` defaults, so the code runs before migration 0034 is applied.

**Tech Stack:** Next.js 16.2 (App Router), React 19, Tailwind CSS 4, Supabase, framer-motion, GSAP, `tsx --test` with `node:assert`.

**Spec:** `docs/superpowers/specs/2026-11-10-public-pages-ux-overhaul-design.md`

## Global Constraints

- Keep Studio Spec: existing tokens in `src/app/globals.css`, zero radius, hairlines, one accent. No new colours, fonts or dependencies.
- `AGENTS.md`: this Next.js version differs from training data. Before editing routing, `searchParams`, `next/image` or server actions, read the matching guide under `node_modules/next/dist/docs/01-app/`.
- Mono caps (`.spec`, `.eyebrow`, `.mono-meta`) only for short labels: section numbers, eyebrows, category tags, badges, dates, counts. Anything a visitor reads uses the body font at 14–16px.
- No invented prices or claims. Retainer price label defaults to "Quote on request". `heroProofNote` defaults to blank.
- Migration `0034` is committed, never applied to the production database by this work.
- Empty data omits the section; nothing renders an empty frame.
- Every new component works in light and dark and inside `.tone-invert` / `.tone-accent`, and respects `prefers-reduced-motion`.
- Out of scope: commission flow, checkout, account pages, admin beyond the new settings fields, Blog, Gallery, Dance, Links, Resume.
- Commit messages end with the session attribution lines used by the existing commit on this branch.

## Review Focus

1. **Settings saved before migration 0034 is applied.** The admin Settings form must still save every existing field; only the new fields are skipped, with a visible notice. Pinned in Task 2.
2. **Nav links list with fewer than five entries, duplicates, or no `/contact`.** The bar must not show a gap or a duplicate, and the "Start a project" button must always exist. Pinned in Task 1.
3. **Process step that already has a description and a dash in its title** ("Build — phase two" + description). It must be left alone. Pinned in Task 1.
4. **Timeline entries with non-numeric or equal years** ("2021", "2021", "Now"). Order must be stable and nothing dropped. Pinned in Task 1.
5. **`/contact?type=` with an unknown or array value, combined with `?service=`.** The form must fall back to no preselection and keep the service prefill. Pinned in Task 1.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/nav-links.ts` (new) | Split settings nav links into bar links and overflow |
| `src/lib/process-steps.ts` (new) | Repair a step whose sentence was typed into the title |
| `src/lib/stats.ts` (new) | Format a stat value for display |
| `src/lib/timeline.ts` (new) | Order timeline newest first and split recent from older |
| `src/lib/inquiry-options.ts` (new) | Project type and budget options, `?type=` preselect |
| `src/lib/public-ux.test.ts` (new) | Tests for the five helpers above |
| `src/lib/data/site-settings.ts` | New settings fields, defaults, `mapRow` |
| `src/lib/supabase/types.ts` | New optional `SiteSettingsRow` columns |
| `supabase/migrations/0034_public_ux_overhaul.sql` (new) | New columns |
| `src/lib/admin/site-settings-actions.ts` | Save new fields; retry without them if columns are missing |
| `src/app/admin/(dashboard)/settings/page.tsx` | Inputs for new fields |
| `src/app/globals.css` | `.label` class |
| `src/components/ui/MagneticButton.tsx` | Body-font button label |
| `src/components/layout/Nav.tsx`, `AccountLink.tsx` | Five links, primary button, body-font links |
| `src/components/ui/ProofLine.tsx` (new) | Compact stats row plus optional note |
| `src/components/hero/Hero.tsx` | Headline, intro, buttons, proof line |
| `src/components/ui/ProjectCard.tsx`, `work/FeaturedWork.tsx` | Trimmed caption; six items, two columns |
| `src/components/services/RetainerBand.tsx` (new) | Retainer pitch |
| `src/components/reviews/Testimonials.tsx`, `ClampedQuote.tsx` (new) | Featured quote plus clamped cards |
| `src/components/reviews/ReviewAvatar.tsx` (new, client) | Avatar with initials fallback |
| `src/components/services/ProcessSteps.tsx`, `ServicesFaq.tsx` (new) | Process and FAQ sections |
| `src/components/about/Timeline.tsx` (new, client) | Collapsible timeline |
| `src/components/contact/InquiryForm.tsx` | Real options, preselect, body-font labels |
| `src/app/(site)/page.tsx`, `work/page.tsx`, `services/page.tsx`, `about/page.tsx`, `contact/page.tsx` | Page composition |

---

### Task 1: Pure helpers and their tests

**Files:**
- Create: `src/lib/nav-links.ts`, `src/lib/process-steps.ts`, `src/lib/stats.ts`, `src/lib/timeline.ts`, `src/lib/inquiry-options.ts`
- Test: `src/lib/public-ux.test.ts`
- Modify: `package.json` (`test` script: append `src/lib/*.test.ts`)

**Interfaces:**
- Produces:
  - `partitionNavLinks(links: NavLink[], max?: number): { primary: NavLink[]; overflow: NavLink[] }` where `NavLink = { label: string; href: string }`
  - `normalizeProcessStep(step: { title: string; description: string }): { title: string; description: string }`
  - `formatStat(stat: { value: number; suffix: string }): string`
  - `splitTimeline<T extends { year: string }>(items: T[], keep?: number): { recent: T[]; older: T[] }`
  - `PROJECT_TYPES`, `BUDGETS` (`readonly { value: string; label: string }[]`), `inquiryPreselect(type: unknown): { projectType: string; budget: string }`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/public-ux.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { partitionNavLinks } from "@/lib/nav-links";
import { normalizeProcessStep } from "@/lib/process-steps";
import { formatStat } from "@/lib/stats";
import { splitTimeline } from "@/lib/timeline";
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
```

- [ ] **Step 2: Add the glob and run to confirm failure**

In `package.json` change the `test` script to:

```json
"test": "tsx --test src/lib/payments/*.test.ts src/lib/commissions/*.test.ts src/lib/*.test.ts scripts/setup-auth.test.ts"
```

Run: `npx tsx --test src/lib/public-ux.test.ts`
Expected: FAIL, cannot find module `@/lib/nav-links`.

- [ ] **Step 3: Implement the helpers**

```ts
// src/lib/nav-links.ts
export type NavLink = { label: string; href: string };

/** The bar shows a few links and a contact button; everything else overflows. */
export function partitionNavLinks(links: NavLink[], max = 5): { primary: NavLink[]; overflow: NavLink[] } {
  const seen = new Set<string>();
  const unique = links.filter((l) => {
    if (l.href === "/contact" || seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
  return { primary: unique.slice(0, max), overflow: unique.slice(max) };
}
```

```ts
// src/lib/process-steps.ts
type Step = { title: string; description: string };
const DASH = " — ";

/** Admin stores "Title|Description"; a line typed without the bar lands whole in the title. */
export function normalizeProcessStep(step: Step): Step {
  if (step.description.trim()) return step;
  const at = step.title.indexOf(DASH);
  if (at <= 0) return step;
  const title = step.title.slice(0, at).trim();
  const description = step.title.slice(at + DASH.length).trim();
  return title && description ? { title, description } : step;
}
```

```ts
// src/lib/stats.ts
export function formatStat(stat: { value: number; suffix: string }): string {
  return `${stat.value.toLocaleString("en-US")}${stat.suffix}`;
}
```

```ts
// src/lib/timeline.ts
/** Newest first, then the first `keep` are shown and the rest sit behind a toggle. */
export function splitTimeline<T extends { year: string }>(items: T[], keep = 6): { recent: T[]; older: T[] } {
  const first = Number.parseInt(items[0]?.year ?? "", 10);
  const last = Number.parseInt(items[items.length - 1]?.year ?? "", 10);
  const ordered = Number.isFinite(first) && Number.isFinite(last) && first < last ? [...items].reverse() : items;
  return { recent: ordered.slice(0, keep), older: ordered.slice(keep) };
}
```

```ts
// src/lib/inquiry-options.ts
export const PROJECT_TYPES = [
  { value: "character", label: "Character illustration" },
  { value: "card-art", label: "Card / TCG art" },
  { value: "brand", label: "Brand identity" },
  { value: "retainer", label: "Monthly retainer" },
  { value: "other", label: "Something else" },
] as const;

export const BUDGETS = [
  { value: "<100", label: "Under $100" },
  { value: "100-500", label: "$100 – $500" },
  { value: "500-2k", label: "$500 – $2,000" },
  { value: "2k+", label: "$2,000+" },
  { value: "retainer", label: "Monthly retainer" },
] as const;

/** `/contact?type=retainer` preselects the retainer in both selects. */
export function inquiryPreselect(type: unknown): { projectType: string; budget: string } {
  return type === "retainer" ? { projectType: "retainer", budget: "retainer" } : { projectType: "", budget: "" };
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `npm test`
Expected: all tests pass, including the eight new ones.

- [ ] **Step 5: Commit** — `git add package.json src/lib && git commit -m "Add tested helpers for nav, process steps, stats, timeline and inquiry options"`

---

### Task 2: Settings fields, migration, safe save, admin inputs

**Files:**
- Modify: `src/lib/supabase/types.ts` (`SiteSettingsRow`), `src/lib/data/site-settings.ts`, `src/lib/admin/site-settings-actions.ts`, `src/app/admin/(dashboard)/settings/page.tsx`
- Create: `supabase/migrations/0034_public_ux_overhaul.sql`
- Test: `src/lib/public-ux.test.ts` (append)

**Interfaces:**
- Produces on `SiteSettings`: `heroHeadline: string`, `heroProofNote: string`, `servicesFaq: { q: string; a: string }[]`, `retainerEnabled: boolean`, `retainerEyebrow: string`, `retainerTitle: string`, `retainerIntro: string`, `retainerPoints: string[]`, `retainerPriceLabel: string`, `retainerCtaLabel: string`
- Produces: `OVERHAUL_COLUMNS: readonly string[]` and `withoutOverhaulColumns(payload)` exported from `src/lib/admin/site-settings-columns.ts` (a plain module, because a `"use server"` file may only export async functions)
- Produces: `parseFaq(raw: string): { q: string; a: string }[]` in the same module

- [ ] **Step 1: Write the failing tests** (append to `src/lib/public-ux.test.ts`)

```ts
import { OVERHAUL_COLUMNS, parseFaq, withoutOverhaulColumns } from "@/lib/admin/site-settings-columns";

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
```

Run: `npx tsx --test src/lib/public-ux.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 2: Column helper module**

```ts
// src/lib/admin/site-settings-columns.ts
/** Columns added by migration 0034. Saving must still work before it is applied. */
export const OVERHAUL_COLUMNS = [
  "hero_headline",
  "hero_proof_note",
  "services_faq",
  "retainer_enabled",
  "retainer_eyebrow",
  "retainer_title",
  "retainer_intro",
  "retainer_points",
  "retainer_price_label",
  "retainer_cta_label",
] as const;

export function withoutOverhaulColumns<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const drop = new Set<string>(OVERHAUL_COLUMNS);
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !drop.has(key))) as Partial<T>;
}

/** One question per line: "Question|Answer". */
export function parseFaq(raw: string): { q: string; a: string }[] {
  return raw
    .split("\n")
    .map((line) => {
      const [q, ...rest] = line.split("|");
      return { q: (q ?? "").trim(), a: rest.join("|").trim() };
    })
    .filter((item) => item.q && item.a);
}
```

Run the tests — Expected: PASS.

- [ ] **Step 3: Migration**

```sql
-- supabase/migrations/0034_public_ux_overhaul.sql
-- Public pages overhaul: an offer headline and proof note for the hero, a
-- general FAQ for /services, and the monthly retainer band. Every column has a
-- default so the site reads the same before and after this runs.

alter table site_settings
  add column if not exists hero_headline text not null default '',
  add column if not exists hero_proof_note text not null default '',
  add column if not exists services_faq jsonb not null default '[]'::jsonb,
  add column if not exists retainer_enabled boolean not null default true,
  add column if not exists retainer_eyebrow text not null default 'Ongoing work',
  add column if not exists retainer_title text not null default 'Monthly retainer',
  add column if not exists retainer_intro text not null default 'A reserved block of illustration and design time every month, for studios and brands with a steady pipeline.',
  add column if not exists retainer_points text[] not null default array['Priority scheduling', 'One point of contact', 'Consistent style across every piece', 'Monthly invoice'],
  add column if not exists retainer_price_label text not null default 'Quote on request',
  add column if not exists retainer_cta_label text not null default 'Ask about a retainer';
```

- [ ] **Step 4: Types and loader**

In `SiteSettingsRow` add, all optional because the row may predate 0034:

```ts
  hero_headline?: string | null;
  hero_proof_note?: string | null;
  services_faq?: { q: string; a: string }[] | null;
  retainer_enabled?: boolean | null;
  retainer_eyebrow?: string | null;
  retainer_title?: string | null;
  retainer_intro?: string | null;
  retainer_points?: string[] | null;
  retainer_price_label?: string | null;
  retainer_cta_label?: string | null;
```

In `SiteSettings` add the ten fields from **Interfaces**. In `placeholderSettings` add:

```ts
  heroHeadline: "Character art, card illustration and brand design for games, studios and creators.",
  heroProofNote: "",
  servicesFaq: [
    { q: "How do revisions work?", a: "Each package lists its included revision rounds. Extra rounds are quoted before any work starts." },
    { q: "How do I pay?", a: "Payment is in USD through PayPal, by balance or card, once the quote is agreed." },
  ],
  retainerEnabled: true,
  retainerEyebrow: "Ongoing work",
  retainerTitle: "Monthly retainer",
  retainerIntro:
    "A reserved block of illustration and design time every month, for studios and brands with a steady pipeline.",
  retainerPoints: ["Priority scheduling", "One point of contact", "Consistent style across every piece", "Monthly invoice"],
  retainerPriceLabel: "Quote on request",
  retainerCtaLabel: "Ask about a retainer",
```

In `mapRow` add (live data never inherits the placeholder headline or FAQ; those are local-preview content only):

```ts
    heroHeadline: row.hero_headline ?? "",
    heroProofNote: row.hero_proof_note ?? "",
    servicesFaq: (row.services_faq ?? []).filter((item) => item?.q && item?.a),
    retainerEnabled: row.retainer_enabled ?? true,
    retainerEyebrow: row.retainer_eyebrow || placeholderSettings.retainerEyebrow,
    retainerTitle: row.retainer_title || placeholderSettings.retainerTitle,
    retainerIntro: row.retainer_intro || placeholderSettings.retainerIntro,
    retainerPoints: row.retainer_points?.length ? row.retainer_points : placeholderSettings.retainerPoints,
    retainerPriceLabel: row.retainer_price_label || placeholderSettings.retainerPriceLabel,
    retainerCtaLabel: row.retainer_cta_label || placeholderSettings.retainerCtaLabel,
```

- [ ] **Step 5: Safe save**

Read `node_modules/next/dist/docs/01-app/` guide on server actions / `redirect` first. In `saveSiteSettings` add to `payload`:

```ts
    hero_headline: String(formData.get("hero_headline") ?? "").trim(),
    hero_proof_note: String(formData.get("hero_proof_note") ?? "").trim(),
    services_faq: parseFaq(String(formData.get("services_faq") ?? "")),
    retainer_enabled: formData.get("retainer_enabled") === "on",
    retainer_eyebrow: String(formData.get("retainer_eyebrow") ?? "").trim(),
    retainer_title: String(formData.get("retainer_title") ?? "").trim(),
    retainer_intro: String(formData.get("retainer_intro") ?? "").trim(),
    retainer_points: linesToList(String(formData.get("retainer_points") ?? "")),
    retainer_price_label: String(formData.get("retainer_price_label") ?? "").trim(),
    retainer_cta_label: String(formData.get("retainer_cta_label") ?? "").trim(),
```

Replace the single write with a write-then-fallback:

```ts
  const write = (values: Record<string, unknown>) =>
    existing
      ? supabase.from("site_settings").update(values).eq("id", existing.id)
      : supabase.from("site_settings").insert(values);

  let { error } = await write(payload);
  let pendingMigration = false;
  // PGRST204: a column in the payload does not exist yet (0034 not applied).
  // Save everything else rather than losing the whole form.
  if (error && (error.code === "PGRST204" || OVERHAUL_COLUMNS.some((c) => error!.message.includes(c)))) {
    ({ error } = await write(withoutOverhaulColumns(payload)));
    pendingMigration = !error;
  }
```

and redirect to `/admin/settings?saved=1&pending=0034` when `pendingMigration` is true.

- [ ] **Step 6: Admin inputs**

In `settings/page.tsx`: accept `pending` in `searchParams` and, when set, show under the saved notice: "Saved, except the hero headline, proof note, FAQ and retainer fields. Run `supabase/migrations/0034_public_ux_overhaul.sql`, then save again."

In the "Homepage — /" fieldset, above the eyebrow field:

```tsx
<Field label="Headline — what you do and for whom. Blank shows the MJFIRD wordmark instead.">
  <input name="hero_headline" defaultValue={settings?.hero_headline ?? ""} className={fieldInputClasses} />
</Field>
<Field label="Proof note — one short credential shown beside the stats, e.g. a marketplace rating. Blank hides it.">
  <input name="hero_proof_note" defaultValue={settings?.hero_proof_note ?? ""} className={fieldInputClasses} />
</Field>
```

After the process steps field add the FAQ textarea (`name="services_faq"`, `rows={6}`, label "FAQ — one per line, “Question|Answer”. Blank hides the section.", `defaultValue` = `settings?.services_faq?.map((f) => `${f.q}|${f.a}`).join("\n") ?? ""`), then a new fieldset "Monthly retainer — Home and /services" with: a checkbox `retainer_enabled` (`defaultChecked={settings?.retainer_enabled ?? true}`, label "Show the retainer section"), inputs `retainer_eyebrow`, `retainer_title`, `retainer_price_label`, `retainer_cta_label`, a textarea `retainer_intro` (`rows={3}`), and a textarea `retainer_points` (`rows={5}`, one per line, `defaultValue={settings?.retainer_points?.join("\n") ?? ""}`). Text defaults mirror the migration defaults.

- [ ] **Step 7: Verify and commit**

Run: `npm test && npm run lint && npx tsc --noEmit`
Expected: pass, no type errors.
Commit: `git commit -am "Add hero headline, proof note, FAQ and retainer settings"` (after `git add` of the new files).

---

### Task 3: Type roles, buttons, nav

**Files:**
- Modify: `src/app/globals.css`, `src/components/ui/MagneticButton.tsx`, `src/components/layout/Nav.tsx`, `src/components/layout/AccountLink.tsx`, `src/components/layout/Footer.tsx`

**Interfaces:**
- Consumes: `partitionNavLinks` (Task 1)
- Produces: CSS class `.label`

- [ ] **Step 1: `.label` class** — in `globals.css`, after the `.meta` rule inside `@layer components`:

```css
  /* Readable small text: nav links, button labels, form labels, attributions.
     The body face in sentence case, where .spec is letterspaced mono caps. */
  .label {
    font-family: var(--font-body);
    font-size: var(--text-body-sm);
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0;
    color: var(--color-ink-muted);
  }
```

- [ ] **Step 2: Buttons** — in `MagneticButton.tsx` replace `"spec group inline-flex…"` with `"group inline-flex items-center justify-center gap-2.5 font-body text-body-sm font-medium tracking-normal …"` (keep the transition classes). The variant classes already set colour. Check the nine call sites still read correctly, including the two admin-free auth pages.

- [ ] **Step 3: Nav**

  - `const { primary, overflow } = partitionNavLinks(links);`
  - Desktop `<nav>` maps `primary`; link class `spec` → `label`, keep the active rule.
  - Right cluster order: availability dot + text (`label`, `lg` and up), `AccountLink`, a `Link` to `/contact` styled as the filled button (`hidden md:inline-flex bg-accent px-4 py-2.5 font-body text-body-sm font-medium text-accent-ink hover:brightness-110`, text "Start a project", `aria-current` when on `/contact`), `ThemeToggle`, menu button.
  - Mobile sheet maps `[...primary, ...overflow]`, then a full-width "Start a project" button above the account link.
  - `AccountLink`: class `spec` → `label`.

- [ ] **Step 4: Footer** — "Usually replies within 48 hours" `spec` → `label`. No structural change.

- [ ] **Step 5: Verify** — `npm run lint`; load `/` at 1440, 1024, 768 and 390 wide and confirm: no wrapping in the bar at 768, the button is visible from `md`, the sheet lists every link and the button, focus order is logo → links → sign in → button → theme.

- [ ] **Step 6: Commit** — `git commit -am "Readable nav and button labels, primary action in the nav"`

---

### Task 4: Hero and proof line

**Files:**
- Create: `src/components/ui/ProofLine.tsx`
- Modify: `src/components/hero/Hero.tsx`, `src/app/(site)/page.tsx` (hero props only)

**Interfaces:**
- Consumes: `formatStat` (Task 1), `settings.heroHeadline`, `settings.heroProofNote`, `settings.stats` (Task 2)
- Produces: `ProofLine({ stats, note, className }: { stats: { value: number; suffix: string; label: string }[]; note?: string; className?: string })`; `Hero` gains props `headline: string`, `stats`, `proofNote: string`

- [ ] **Step 1: ProofLine**

```tsx
// src/components/ui/ProofLine.tsx
import { formatStat } from "@/lib/stats";
import { cn } from "@/lib/cn";

type Stat = { value: number; suffix: string; label: string };

/** The numbers a visitor needs before they scroll: static, compact, no animation. */
export default function ProofLine({ stats, note, className }: { stats: Stat[]; note?: string; className?: string }) {
  if (stats.length === 0 && !note) return null;
  return (
    <div className={cn("flex flex-col gap-4 border-t border-line pt-5", className)}>
      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {stats.slice(0, 4).map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-0.5">
              <dt className="text-body-sm text-ink-muted">{stat.label}</dt>
              <dd className="font-display text-xl font-semibold tabular-nums tracking-[-0.02em] text-ink">
                {formatStat(stat)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {note && (
        <p className="flex items-center gap-2 text-body-sm text-ink">
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-accent" />
          {note}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Hero** — in `Hero.tsx`:

  - Add props `headline`, `stats`, `proofNote`.
  - Replace the two stacked blocks (eyebrow + wordmark, then intro + buttons spread by `lg:justify-between`) with one column: eyebrow; then `headline ? <h1 className="display-lg max-w-xl">{headline}</h1> : <KineticWordmark />`; intro (`max-w-md`); buttons; `<ProofLine stats={stats} note={proofNote} className="mt-2 w-full max-w-xl" />`. Gap `gap-7`.
  - Container: drop `lg:justify-between lg:gap-0`; use `justify-center`; replace `lg:min-h-svh` with `lg:min-h-[max(70svh,40rem)]`; the no-media branch uses the same floor.
  - The copy column must not run under the media panel: add `lg:max-w-[50%]` to the column wrapper when `hasMedia`.
  - When the wordmark is not rendered and `headline` is set, the `h1` is the page's only `h1`; confirm `KineticWordmark` is not also emitting one.
  - Keep the per-slide eyebrow/intro/button overrides and the corner arrow as they are.

- [ ] **Step 3: Page** — pass `headline={settings.heroHeadline} stats={settings.stats} proofNote={settings.heroProofNote}`.

- [ ] **Step 4: Verify** — at 1440×900 the hero's bottom edge is above the fold and the "Selected work" rule is visible; at 390 the order is eyebrow, headline, intro, buttons, proof, then the media band; with `heroHeadline` set to `""` in placeholder data the wordmark renders as before (restore afterwards).

- [ ] **Step 5: Commit** — `git commit -am "Offer-led hero with a proof line"`

---

### Task 5: Work cards, Home selection, Work page

**Files:**
- Modify: `src/components/ui/ProjectCard.tsx`, `src/components/work/FeaturedWork.tsx`, `src/app/(site)/page.tsx`, `src/app/(site)/work/page.tsx`

- [ ] **Step 1: Card caption** — in `ProjectCard.tsx` replace the caption block with: title (`display-sm`), then one line `client · year` in `.label`, with the category as the existing bordered `.spec` tag on the right of the title row. Remove the hook paragraph, the index number and the hover-only "View project →" (the whole card is the link; keep the title colour change on hover). Skip the `·` when client or year is blank.

- [ ] **Step 2: Home** — `FeaturedWork` passes `projects.slice(0, 6)` and `columns={2}`; update its comment. In `page.tsx` render the work band only when `featured.length > 0`.

- [ ] **Step 3: Work page** — add `description="Character art, card illustration and brand work for clients worldwide."` to its `SectionHeader`; update the page `metadata.description` to the same sentence.

- [ ] **Step 4: Verify** — covers are ~620px wide at 1440; a vertical cover is not cropped differently from before (same 4:3 frame); the grid is one column at 390.

- [ ] **Step 5: Commit** — `git commit -am "Larger work covers with trimmed captions"`

---

### Task 6: Home services, retainer band, testimonials

**Files:**
- Create: `src/components/services/RetainerBand.tsx`, `src/components/reviews/Testimonials.tsx`, `src/components/reviews/ClampedQuote.tsx`, `src/components/reviews/ReviewAvatar.tsx`
- Modify: `src/app/(site)/page.tsx`, `src/components/reviews/ReviewCard.tsx`

**Interfaces:**
- Consumes: retainer settings (Task 2), `getStorefrontServices()` and `ServiceCard` (existing), `Testimonial` type
- Produces: `RetainerBand({ settings }: { settings: Pick<SiteSettings, "retainerEnabled" | "retainerEyebrow" | "retainerTitle" | "retainerIntro" | "retainerPoints" | "retainerPriceLabel" | "retainerCtaLabel"> })`; `Testimonials({ items }: { items: Testimonial[] })`

- [ ] **Step 1: Avatar fallback first (spec §8)** — reproduce: load the live home page in Chromium, scroll to testimonials, and record whether avatar requests fail (status, URL host) or were only lazy-loaded. Then:

```tsx
// src/components/reviews/ReviewAvatar.tsx
"use client";

import { useState } from "react";
import SmartImage from "@/components/media/SmartImage";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");
}

/** A client portrait, or their initials when there is none or it fails to load. */
export default function ReviewAvatar({ src, name, size = "h-9 w-9" }: { src?: string; name: string; size?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden border border-line bg-bg-raised-2 ${size}`}>
      {src && !failed ? (
        <span onErrorCapture={() => setFailed(true)} className="absolute inset-0">
          <SmartImage src={src} alt="" sizes="48px" />
        </span>
      ) : (
        <span aria-hidden="true" className="text-[0.6875rem] font-medium text-ink-muted">{initials(name)}</span>
      )}
    </span>
  );
}
```

`error` events do not bubble but are delivered in the capture phase, which is why the wrapper uses `onErrorCapture`. If the reproduction shows a config cause (for example an avatar host missing from `next.config.ts` `remotePatterns`), fix that too and say so in the commit.

- [ ] **Step 2: ReviewBody** — in `ReviewCard.tsx` use `ReviewAvatar` (always rendered, so every attribution has a mark) and change the attribution from `.spec` to: name in `text-body-sm font-medium text-ink`, role under it in `text-body-sm text-ink-muted`.

- [ ] **Step 3: ClampedQuote**

```tsx
// src/components/reviews/ClampedQuote.tsx
"use client";

import { useState } from "react";

const LONG = 220;

/** Four lines, with the rest one click away, so six long quotes stop being a wall. */
export default function ClampedQuote({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG;
  return (
    <>
      <span className={`whitespace-pre-line ${long && !open ? "line-clamp-4" : ""}`}>{text}</span>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="self-start text-body-sm font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}
```

- [ ] **Step 4: Testimonials** — server component. `const [lead, ...rest] = items; const cards = rest.slice(0, 4);` Returns `null` for an empty list. Lead: a `figure` in a two-column grid at `lg` (`lg:grid-cols-[1.4fr_1fr]`), quote in `display-sm font-normal` with the accent bar and stars above it, attribution with a `h-12 w-12` `ReviewAvatar` and the verified badge. Cards: `grid border-t border-line sm:grid-cols-2`, each a `figure` with hairline compartments, quote through `ClampedQuote`, same attribution at `h-9 w-9`. With no cards, the lead spans the full width.

- [ ] **Step 5: RetainerBand**

```tsx
// src/components/services/RetainerBand.tsx
import MagneticButton from "@/components/ui/MagneticButton";
import SectionBand from "@/components/layout/SectionBand";
import Reveal from "@/components/motion/Reveal";
import type { SiteSettings } from "@/lib/data/site-settings";

type Props = {
  settings: Pick<
    SiteSettings,
    | "retainerEnabled" | "retainerEyebrow" | "retainerTitle" | "retainerIntro"
    | "retainerPoints" | "retainerPriceLabel" | "retainerCtaLabel"
  >;
};

/** The one accent band on the page: ongoing monthly work, for clients who want more than one piece. */
export default function RetainerBand({ settings }: Props) {
  if (!settings.retainerEnabled) return null;
  return (
    <SectionBand tone="accent" id="retainer">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <Reveal className="flex flex-col items-start gap-6">
          <p className="eyebrow">{settings.retainerEyebrow}</p>
          <h2 className="display-lg">{settings.retainerTitle}</h2>
          <p className="max-w-lg text-body-lg text-pretty text-ink-muted">{settings.retainerIntro}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
            <MagneticButton href="/contact?type=retainer" size="lg" variant="secondary" arrow>
              {settings.retainerCtaLabel}
            </MagneticButton>
            <span className="text-body text-ink">{settings.retainerPriceLabel}</span>
          </div>
        </Reveal>
        {settings.retainerPoints.length > 0 && (
          <Reveal as="ul" delay={80} className="flex flex-col border-t border-line">
            {settings.retainerPoints.map((point) => (
              <li key={point} className="flex items-baseline gap-4 border-b border-line py-4 text-body-lg text-ink">
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 translate-y-[-0.2em] bg-current" />
                {point}
              </li>
            ))}
          </Reveal>
        )}
      </div>
    </SectionBand>
  );
}
```

`variant="secondary"` reads from `--color-ink` / `--color-bg`, which `.tone-accent` re-points, so the button is an outlined accent-ink button on the accent fill; confirm its hover state is legible and adjust only inside this component if not.

- [ ] **Step 6: Home composition** — in `page.tsx`: load `getStorefrontServices()` in place of `getServices()`; remove the stats band, `AnimatedNumber` import and `STATS_TONE`; services band (`tone="invert"`) renders `storefront.slice(0, 3)` with `ServiceCard` in `grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3`, header action "All services" → `/services`, omitted when the list is empty; then `<RetainerBand settings={settings} />`; then the testimonials band with `<Testimonials items={testimonials} />`, omitted when empty. `ServiceCard`'s title is an `h2`; on Home it sits under a section `h2`, so add an optional `headingLevel?: "h2" | "h3"` prop (default `"h2"`) and pass `"h3"` here.

- [ ] **Step 7: Verify** — `/` in light and dark at 1440 and 390: services cards legible on the inverted band; retainer band legible on the accent fill; "Read more" toggles by keyboard and announces `aria-expanded`; with `testimonials.slice(0, 1)` only the lead shows. Record the phone page height.

- [ ] **Step 8: Commit** — `git commit -am "Home: service cards, retainer band and featured testimonials"`

---

### Task 7: Services page

**Files:**
- Create: `src/components/services/ProcessSteps.tsx`, `src/components/services/ServicesFaq.tsx`
- Modify: `src/app/(site)/services/page.tsx`

**Interfaces:**
- Consumes: `normalizeProcessStep` (Task 1), `settings.servicesFaq` (Task 2), `RetainerBand` (Task 6)

- [ ] **Step 1: ProcessSteps** — server component taking `steps`. Maps through `normalizeProcessStep`, renders the existing numbered `ol` (`grid gap-8 sm:grid-cols-2 lg:grid-cols-4`), key by index, and renders the description `p` only when non-empty.

- [ ] **Step 2: ServicesFaq**

```tsx
// src/components/services/ServicesFaq.tsx
/** General questions. Native disclosure: works without JavaScript and by keyboard. */
export default function ServicesFaq({ items }: { items: { q: string; a: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <details key={item.q} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
            <span className="display-sm">{item.q}</span>
            <span aria-hidden="true" className="text-body-lg text-ink-muted transition-transform duration-[var(--duration-fast)] group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="max-w-2xl whitespace-pre-line pb-6 text-body text-pretty text-ink-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Page** — order: header → cards → `RetainerBand` → process → FAQ. The header becomes `<SectionHeader index={1} eyebrow="Services" title="Commissions & services" description={availabilityLine} />` where `availabilityLine = settings.servicesAvailabilityHeading.split("\n").join(" ")` (omit when blank). Delete the standalone availability block and the now-unused `availabilityLines`. Process section uses `<ProcessSteps steps={settings.processSteps} />`. FAQ section (index 3, eyebrow "FAQ", title "Before you ask") renders only when `settings.servicesFaq.length > 0`.

- [ ] **Step 4: Verify** — temporarily set one placeholder step to `{ title: "Brief — We lock the goal.", description: "" }` and confirm it renders as a short title with a description, then restore. Tab to an FAQ item, open it with Enter and Space. Confirm exactly one call to action block remains at the page end (the footer's).

- [ ] **Step 5: Commit** — `git commit -am "Services: retainer, repaired process steps, FAQ, one closing call to action"`

---

### Task 8: About page

**Files:**
- Create: `src/components/about/Timeline.tsx`
- Modify: `src/app/(site)/about/page.tsx`

**Interfaces:**
- Consumes: `splitTimeline` (Task 1), `AnimatedNumber` (existing)

- [ ] **Step 1: Timeline**

```tsx
// src/components/about/Timeline.tsx
"use client";

import { useState } from "react";
import { splitTimeline } from "@/lib/timeline";

type Entry = { year: string; label: string; detail: string };

function Row({ item }: { item: Entry }) {
  return (
    <li className="grid grid-cols-[4.5rem_1fr] gap-6 border-t border-line py-6 sm:grid-cols-[9rem_1fr]">
      <span className="mono-meta pt-1 text-accent-strong">{item.year}</span>
      <div>
        <h3 className="display-sm">{item.label}</h3>
        {item.detail && <p className="mt-1.5 max-w-2xl text-body-sm text-pretty text-ink-muted">{item.detail}</p>}
      </div>
    </li>
  );
}

/** Newest first; older history is one click away so the page is not thirteen rows long. */
export default function Timeline({ items }: { items: Entry[] }) {
  const [open, setOpen] = useState(false);
  const { recent, older } = splitTimeline(items);
  return (
    <div className="flex flex-col">
      <ol className="flex flex-col border-b border-line">
        {recent.map((item, i) => <Row key={`${item.year}-${i}`} item={item} />)}
        {open && older.map((item, i) => <Row key={`older-${item.year}-${i}`} item={item} />)}
      </ol>
      {older.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-6 self-start border border-ink px-5 py-3 text-body-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:bg-ink hover:text-bg"
        >
          {open ? "Show less" : `Show full history (${older.length} more)`}
        </button>
      )}
    </div>
  );
}
```

The year colour moves from `text-accent` to `text-accent-strong`: `globals.css` records that the raw accent is not a text colour on this ground.

- [ ] **Step 2: Page** — between the bio block and the timeline band insert a stats row, rendered only when `settings.stats.length > 0`:

```tsx
<div className="border-t border-line">
  <div className="container-page grid grid-cols-2 gap-y-10 py-14 sm:grid-cols-4">
    {settings.stats.map((stat, i) => (
      <Reveal key={stat.label} delay={i * 60}>
        <AnimatedNumber value={stat.value} suffix={stat.suffix} label={stat.label} />
      </Reveal>
    ))}
  </div>
</div>
```

In `AnimatedNumber` change the label from `.spec` to `text-body-sm text-ink-muted` and write values with `toLocaleString("en-US")` so 1988 reads "1,988". Replace the timeline `ol` with `<Timeline items={settings.aboutTimeline} />`. Update `metadata.description` to "About M.J. Fird: illustrator and graphic designer based in Indonesia."

- [ ] **Step 3: Verify** — placeholder data has five entries: no toggle. Temporarily duplicate entries to nine: six show, toggle reveals three, focus stays on the button. Restore.

- [ ] **Step 4: Commit** — `git commit -am "About: stats row and collapsible timeline"`

---

### Task 9: Contact page

**Files:**
- Modify: `src/components/contact/InquiryForm.tsx`, `src/app/(site)/contact/page.tsx`

**Interfaces:**
- Consumes: `PROJECT_TYPES`, `BUDGETS`, `inquiryPreselect` (Task 1)
- Produces: `InquiryForm` props `{ initialMessage?: string; initialProjectType?: string; initialBudget?: string; contactEmail: string }`

- [ ] **Step 1: Form** — read the `searchParams` guide under `node_modules/next/dist/docs/01-app/` first. Render both selects from `PROJECT_TYPES` and `BUDGETS`; `defaultValue` comes from the new props. Field labels and error text change from `.spec` to `.label` (errors keep `text-error`). The error fallback sentence uses `contactEmail` in a `mailto:` link. Validation messages change "Tell us" / "Give us" to "Tell me" / "Give me", matching the page's first-person voice. `/api/inquiries` already accepts any non-empty string for both fields, so it needs no change; add `.max(60)` to its `projectType` and `budget` and `.max(5000)` to `message` so the endpoint is bounded.

- [ ] **Step 2: Page** — `const preselect = inquiryPreselect(params.type)`; pass `initialProjectType`, `initialBudget`, `contactEmail`. Resolve `searchParams` once and reuse it for both `servicePrefill` and the preselect. Under the intro paragraph add:

```tsx
<ol className="flex flex-col border-t border-line">
  {[
    "I reply within two days.",
    "You get a quote and a timeline.",
    "Work starts once payment is in.",
  ].map((line, i) => (
    <li key={line} className="flex items-baseline gap-4 border-b border-line py-3.5 text-body text-ink">
      <span className="mono-meta text-ink">{String(i + 1).padStart(2, "0")}</span>
      {line}
    </li>
  ))}
</ol>
```

Change the heading eyebrow "Or, email direct" from `.eyebrow` to `.label`.

- [ ] **Step 3: Verify** — `/contact?type=retainer` shows both selects on "Monthly retainer"; `/contact?type=x`, `/contact?type=a&type=b` and `/contact` show "Select one"; `/contact?service=<slug>&type=retainer` keeps the service prefill; submitting empty shows readable errors; a valid submit reaches the success state (local: logged to the dev console).

- [ ] **Step 4: Commit** — `git commit -am "Contact: real project types and budgets, retainer preselect, next steps"`

---

### Task 10: Whole-site verification and hand-off

- [ ] **Step 1:** `npm run lint && npm test && npm run build` — all pass.
- [ ] **Step 2:** Remaining `.spec` on readable text: `grep -rn 'className="[^"]*\bspec\b' src/components src/app/\(site\)` and review each hit against the Global Constraints rule; fix captions and attributions that were missed, leave true labels.
- [ ] **Step 3:** Screenshots of Home, Work, Services, About, Contact at 1440 and 390, light and dark, against real content (local dev pointed at the project's public URL and publishable key in an untracked `.env.local`, read-only). Compare with the "before" set in the scratchpad. Record phone Home height before and after.
- [ ] **Step 4:** Keyboard pass: nav, mobile sheet, testimonial toggles, timeline toggle, FAQ, inquiry form.
- [ ] **Step 5:** Push, update the pull request description with what shipped, the before/after heights, the migration note and the owner's two content edits (toolkit hardware, nav order) plus the suggested hero headline.

---

## Self-review notes

- Spec §3.1–3.3 → Task 3 (and label swaps inside Tasks 5, 6, 8, 9). §5.1 → Tasks 4, 5, 6. §5.2 → Task 5. §5.3 → Task 7. §5.4 → Task 8. §5.5 → Task 9. §6 → Tasks 2, 6, 7. §7 → Task 2. §8 → Tasks 6 (avatars, empty lists), 4 (no media), 3–9 verify steps (themes, reduced motion). §9 → Tasks 1, 2, 10.
- One deliberate tightening of the spec: timeline is shown newest first (spec said "six most recent" without an order), so the visible six and the toggle read top-down.
- One deliberate addition: request size bounds on `/api/inquiries`.
