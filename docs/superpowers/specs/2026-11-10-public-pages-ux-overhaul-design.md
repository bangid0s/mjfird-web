# Public pages UX overhaul — design

Date: 2026-11-10
Status: approved in conversation, pending written-spec review
Builds on: the "Studio Spec" design system (migrations 0025, 0026) and the service storefront (PR #34)

## 1. Goal

Make the public pages of mjfird.com convert a first-time visitor into a
commission client, and give long-term (monthly retainer) clients a visible way
in. The visual identity stays: grey sheet, single accent, hard edges, Instrument
Sans / Geist / JetBrains Mono. What changes is structure, hierarchy,
readability and the conversion path.

Success looks like:

- A stranger can say what MJFIRD sells, for roughly how much, and how to start,
  from the first screen of the home page.
- Artwork is the largest element on Home and Work.
- A retainer offer exists on Home and Services and leads to a pre-filled inquiry.
- Body-size text is used for anything a visitor reads; mono caps only label.
- The phone home page is materially shorter than today's ~10,400px.

### Decisions made with the owner

| Topic | Decision |
|---|---|
| Scope, this phase | Public pages: Home, Work, Services, About, Contact, plus the shared nav, footer call to action and type rules. |
| Visual direction | Keep Studio Spec. Rebuild layouts, do not re-brand. |
| Retainer price and inclusions | Not supplied yet. Ships as "Quote on request" with admin-editable copy; no invented prices. |
| Proof line | "796+ clients · 9 countries · Fiverr Top Rated", taken from the live site. Built from existing stats plus one new editable line, so the owner can correct it. |

### Out of scope

The commission request flow, PayPal checkout, client account pages, the admin
dashboard (beyond the new settings fields in section 7), and the Blog, Gallery,
Break-Boy/Dance, Links and Resume pages beyond what they inherit from the
shared type and nav changes. No new dependencies.

## 2. Findings this design answers

Observed on the live site at 1440px and 390px on 2026-11-10.

1. The hero headline is the wordmark. The offer is in a small paragraph below a
   large empty gap.
2. Home shows nine equal 3-column thumbnails with uneven captions.
3. Proof (client count, illustration count, Fiverr Top Rated) is in an
   unexplained accent strip or deep in the About timeline.
4. Six long testimonials at equal weight; avatars rendered as broken images in
   the capture (to be reproduced and fixed, see section 8).
5. No retainer offer. The home services section has no price and no link.
6. Process steps hold a full sentence in the title field ("Brief — We lock the
   goal…") and render it at heading size.
7. Services ends with two consecutive call-to-action blocks. The nav has no
   primary action.
8. Nav links, captions, meta lines, form labels and errors are 11.5px uppercase
   letterspaced mono.
9. The inquiry form offers "Web design & build", "Motion / interaction" and
   budgets from "Under $5k" to "$25k+", while live services start at $30.

## 3. Shared foundations

### 3.1 Type roles

`.spec` / `.eyebrow` / `.mono-meta` remain, restricted to short labels: section
numbers and eyebrows, category tags, availability badges, dates and counts.

Moved to the body font, sentence case, 14–16px: nav links, button labels, work
and service captions, testimonial attributions, form labels and form errors,
footer link headings' content. A new `.label` class (body font, 14px, medium,
`--color-ink-muted`) replaces `.spec` in those places so the change is one class
swap per call site.

### 3.2 Nav

- Desktop: logo, up to five links, then "Sign in" (text link) and a filled
  accent button "Start a project" linking to `/contact`. The availability dot
  stays next to the button.
- The link list is still `settings.navLinks`. The bar shows the first five that
  are not `/contact`; the rest appear in the mobile sheet and the footer
  sitemap, which already lists them. No admin change is needed to get the new
  bar; the owner controls which five by ordering.
- Mobile sheet: all links, then the same button full width.

### 3.3 Closing call to action

The footer's "Let's make something" block is the one closing call to action on
every page. Page-level duplicates are removed (Services' availability block
becomes a line inside the services header, see 5.3).

## 4. Components

New or reshaped units, each with one job:

| Component | Job | Used by |
|---|---|---|
| `hero/Hero.tsx` (reshaped) | Offer headline, intro, two buttons, proof line, media panel | Home |
| `ui/ProofLine.tsx` (new) | Renders stats + a free-text badge as one inline row | Hero, About |
| `work/ProjectsGrid.tsx`, `ui/ProjectCard.tsx` (reshaped) | Larger cards, trimmed caption | Home, Work |
| `services/ServiceCard.tsx` (reused) | Unchanged card | Home, Services |
| `services/RetainerBand.tsx` (new) | Retainer pitch with inclusions and button | Home, Services |
| `reviews/Testimonials.tsx` (new) | One featured quote plus clamped cards | Home |
| `reviews/ClampedQuote.tsx` (new, client) | Four-line clamp with "Read more" toggle | Testimonials |
| `services/ProcessSteps.tsx` (new) | Numbered steps with title/description split | Services |
| `services/ServicesFaq.tsx` (new) | Disclosure list of general questions | Services |
| `about/Timeline.tsx` (new, client) | Highlights first, "Show full history" toggle | About |
| `contact/InquiryForm.tsx` (reshaped) | Real project types and budgets, retainer preselect | Contact |

## 5. Pages

### 5.1 Home

Order: Hero → Selected work → Services → Retainer → Testimonials → footer call
to action. The accent stats band is removed; its numbers move to the hero proof
line and to About.

**Hero.** Split layout kept (copy left, media right, nothing painted over the
artwork). Changes:

- `h1` is a new setting `heroHeadline`, set in `.display-lg`. When blank it
  falls back to the kinetic wordmark so the current look still works.
- The wordmark is no longer the headline when `heroHeadline` is set; the logo
  in the nav carries the name.
- Intro paragraph sits directly under the headline (no min-height gap between
  them); buttons follow; the proof line follows the buttons.
- Primary button "See the work" → `/work`; secondary "Start a project" →
  `/contact`. Labels stay admin-editable.
- Section height is content-driven with a floor of roughly 70svh on desktop,
  instead of a full `min-h-svh`, so the top of Selected work shows on common
  laptop heights.

**Selected work.** Featured projects, first six, in two columns at `sm` and up
(the existing `columns={2}` mode), so each cover is about 620px wide on desktop
against about 400px now. A single oversized lead card is deliberately not used:
`ProjectsGrid` records that it was tried and cropped vertical illustration.
Caption becomes title, category tag, and "client · year"; the hook sentence
moves to the project page. No filter chips on Home (Work keeps them).

**Services.** `getStorefrontServices()` rendered with `ServiceCard`, up to
three, with an "All services" link. This replaces the text-only compartments
and gives price, turnaround and availability on the home page. Section stays on
the inverted band.

**Retainer.** `RetainerBand` on the accent band, taking over the accent
punctuation the stats strip had. See 6.

**Testimonials.** First testimonial (by `sort_order`) large: quote in
`.display-sm`, attribution with avatar. The next four as cards in a 2×2 grid,
quote clamped to four lines with a "Read more" toggle when it overflows. Any
beyond five are not shown on Home. Verified badge and stars are kept.

### 5.2 Work

Same `ProjectsGrid`, two columns, filter chips kept, same trimmed caption.
Page header gains a one-line description.

### 5.3 Services

Order: header (with the availability line under the title) → service cards →
Retainer → Process → FAQ → footer call to action.

- **Process.** `ProcessSteps` renders `settings.processSteps`. If a step's
  description is blank and its title contains " — ", the text is split at the
  first " — " into title and description. This repairs the live content without
  an admin edit and leaves well-formed steps untouched.
- **FAQ.** `ServicesFaq` renders a new setting `servicesFaq: {q, a}[]` using
  native `<details>`. The section is omitted when the list is empty. Defaults
  ship as placeholder data only; live content comes from admin.
- The standalone "Available for Work" block is removed.

### 5.4 About

Order: portrait + bio → stats row → timeline → toolkit.

- **Stats.** `settings.stats` in a four-column row with `AnimatedNumber`, on
  plain ground with hairlines.
- **Timeline.** Shows the six most recent entries; "Show full history" expands
  the rest in place. With six or fewer entries there is no toggle.
- **Toolkit.** Unchanged component. Removing hardware entries is a content
  edit the owner makes in admin; it is noted in the hand-off, not coded.

### 5.5 Contact

- Project type options: Character illustration, Card / TCG art, Brand identity,
  Monthly retainer, Something else.
- Budget options: Under $100, $100 – $500, $500 – $2,000, $2,000+, Monthly
  retainer.
- `/contact?type=retainer` preselects "Monthly retainer" in both selects.
- A three-line "What happens next" list under the intro: reply within two
  days, a quote and timeline, work starts on payment.
- The error fallback email uses `settings.contactEmail`, not a hard-coded
  address.
- `/api/inquiries` is checked for an allow-list of these values and updated to
  match; stored inquiries keep whatever value they already have.

## 6. Retainer offer

`RetainerBand` content, all admin-editable, with safe defaults:

| Setting | Default |
|---|---|
| `retainerEnabled` | `true` |
| `retainerEyebrow` | "Ongoing work" |
| `retainerTitle` | "Monthly retainer" |
| `retainerIntro` | "A reserved block of illustration and design time every month, for studios and brands with a steady pipeline." |
| `retainerPoints` | "Priority scheduling", "One point of contact", "Consistent style across every piece", "Monthly invoice" |
| `retainerPriceLabel` | "Quote on request" |
| `retainerCtaLabel` | "Ask about a retainer" |

The button links to `/contact?type=retainer`. `retainerEnabled = false` hides
the band on both pages. No price is displayed until the owner enters one.

## 7. Data and admin

New site settings: `heroHeadline`, `heroProofNote`, `servicesFaq`, and the
seven `retainer*` fields.

- Migration `0034_public_ux_overhaul.sql` adds the columns to `site_settings`
  with the defaults above (`servicesFaq` as `jsonb` default `[]`,
  `retainerPoints` as `text[]`).
- `getSiteSettings()` must return the defaults when the columns do not exist
  yet, so the code deploys safely before the migration is applied. The existing
  loader's handling of missing columns is followed or extended to guarantee
  this.
- The admin Settings page gains fields for the new settings, following the
  existing field components. This is the only admin change.
- The migration is committed but **not applied** to the production database by
  this work. Applying it is a step for the owner (or on explicit request).

## 8. Errors and edge cases

- No featured projects, no services, no testimonials: the section is omitted
  rather than rendered empty (Services page keeps its existing empty state).
- Hero with no media: copy spans the sheet, as today.
- Fewer than five testimonials: featured quote plus whatever remains; one
  testimonial renders featured only.
- Testimonial avatars: reproduce the broken-image rendering against the live
  URLs first. If the cause is in `SmartImage` or its `sizes`/loader config, fix
  it; if it was only lazy-loading in the capture, record that and change
  nothing. Either way an avatar that fails to load falls back to initials.
- Reduced motion: every new toggle and reveal respects the existing
  `prefers-reduced-motion` handling; clamping and disclosure work without
  JavaScript-driven animation.
- Both themes: every new component uses the existing tokens and is checked in
  light and dark, including inside `.tone-invert` and `.tone-accent`.

## 9. Testing and verification

- Unit tests (existing `tsx --test` runner) for the two pure functions this
  adds: the process-step title split and the nav link partition (first five
  non-contact links vs overflow).
- `npm run lint`, `npm test`, `npm run build` pass.
- Before/after full-page screenshots of Home, Work, Services, About and
  Contact at 1440px and 390px, light and dark, attached to the pull request.
  The phone home page height is recorded before and after.
- Keyboard pass on the nav, the testimonial and timeline toggles, the FAQ and
  the inquiry form.
- Per `AGENTS.md`, the relevant guides in `node_modules/next/dist/docs/` are
  read before touching routing, `searchParams` or image handling.

## 10. Delivery

One draft pull request from `claude/lucid-sagan-3y7ic9`, committed in this
order so each commit leaves the site working: foundations (type role, nav),
Home, Work, Services, About, Contact, settings + migration + admin fields.
