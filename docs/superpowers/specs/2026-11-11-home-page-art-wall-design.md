# Home page: art wall and commission menu — design

Date: 2026-11-11
Status: design approved in conversation, pending written-spec review
Builds on: the "Studio Spec" design system and the public pages overhaul
(`2026-11-10-public-pages-ux-overhaul-design.md`)

## 1. Goal

Rebuild the home page so that a first-time visitor who wants a character or
card commission can see the artwork, the price and the way to order without
leaving the page. Only the home page changes.

Success looks like:

- The first screen, on desktop and on a phone, shows real commissions and says
  what is for sale, from what price and how fast.
- Every published commission is on the page with its own samples, its package
  prices and an order button.
- A visitor can learn how a commission runs and get the common questions
  answered on the home page.
- Studios and brands still have a way in (projects, retainer, testimonials),
  grouped lower on the page.
- The phone page is about as tall as today's 9,586px while carrying every
  service, the process and the FAQ. As built it measures 9,743px at 390px wide
  with five published services (a fifth was published while this was being
  built; each service row is about 520px on a phone).

### Decisions made with the owner

| Topic | Decision |
|---|---|
| Lead buyer | Individual commissioners (TTRPG, MTG, Pokémon, emotes). Studios and brands are the second audience. |
| Visual direction | Evolve Studio Spec, art-first. Same fonts, accent, square edges and tokens. No new colours or fonts. |
| Page concept | "Art wall + menu": offer beside a wall of commissions, then a priced commission menu. |
| B2B content | Kept: featured projects, retainer band and testimonials, grouped after the commissioner sections. |
| Live data | Nothing is written to the live database by this work. |

### Out of scope

Every page other than Home; the nav and footer; the commission request flow
and checkout; the admin beyond the one new hero setting; new dependencies.

## 2. Findings this design answers

Observed on mjfird.com at 1440px and 390px, and in the live content, on
2026-11-11.

1. The `h1` is the wordmark. `hero_headline` is blank on live, so the first
   screen names the artist and not the offer.
2. On a phone the hero artwork sits below the copy and the stats, so the first
   screen of an illustrator's site carries no artwork.
3. The home page shows six project covers cropped to 4:3. The gallery holds 41
   pieces; 25 are filed under the four published commissions (D&D 17, MTG 7,
   Pokémon 1, Emotes 0). The character pieces are 828×1159, which is 5:7, the
   proportion of a trading card.
4. Three of the four published services are shown. Emotes, the cheapest entry
   point (from $15), is missing. A service card shows one cover and "From $35"
   but not the packages.
5. There is no process and no FAQ on the home page. Each service has its own
   FAQ and terms; the site-wide `services_faq` setting is empty.
6. The six testimonials are all from design and brand clients, none verified,
   none rated. They sit at the end of a page that otherwise sells commissions.
7. Motion is a uniform fade-up; nothing on the page is specific to this artist.

## 3. Page structure

Order: Hero → Commission menu → How it works → Questions → Selected projects →
Retainer → Testimonials → footer call to action (unchanged, shared).

| # | Section | Band | Source |
|---|---|---|---|
| — | Hero with art wall | plain | settings, services, gallery |
| 01 | Commission menu | plain | services, gallery |
| 02 | How it works | inverted | `settings.processSteps`, services |
| 03 | Questions | plain | `settings.servicesFaq`, else defaults in 5.4 |
| 04 | Selected projects | plain | featured projects |
| — | Retainer | accent | existing `RetainerBand` |
| 05 | Testimonials | plain | testimonials |

A section with no data is omitted, as today. Section numbers are assigned in
render order, so an omitted section leaves no gap in the numbering.

## 4. Hero

Two hero styles exist after this work, chosen by a new setting `heroStyle`:

- `wall` (default): the new hero described here.
- `slider`: today's `Hero` component, unchanged, with the admin's slides.

The wall also needs at least six eligible gallery images (4.2). With fewer, the
page renders the slider hero whatever the setting says, so the hero is never a
half-empty wall.

### 4.1 Copy column

Top to bottom:

1. **Status and eyebrow.** A status mark built from the services' availability:
   "Open for commissions" when any service is open, "Waitlist open" when none is
   open but one is on waitlist, "Commissions closed" otherwise. Then
   `settings.heroEyebrow`.
2. **Headline (`h1`, `.display-lg`).** `settings.heroHeadline`. When blank, the
   default is used: "Custom character art for your D&D party, MTG deck and
   Pokémon cards." The wordmark is not used as a headline in wall mode.
3. **Intro.** `settings.heroIntro`, body-large, at most the width of the column.
4. **Facts line.** Computed from the published services, never typed:
   - "From $N": the lowest package price across all services.
   - "N+ days": the shortest delivery time across all packages that state one.
   - "N revision rounds": the lowest revision count across all packages, shown
     only when it is above zero.
   A fact with no data is left out; with no facts the line is omitted.
5. **Buttons.** The existing two hero buttons, labels and destinations from
   settings, unchanged.
6. **Stats.** `settings.stats` and `settings.heroProofNote` through `ProofLine`,
   static as today. A count-up was considered and dropped: the server-rendered
   page would show the final number and then jump back to zero once the script
   loaded.

### 4.2 Art wall

**Which images.** Published gallery items that are still images (not video or
YouTube) and are filed under at least one published service. They are taken in
turn across the services in service order (one from the first service, one from
the second, and so on, each service's own images in gallery order) so the wall
is a mix and not one service's run. Up to 18 are used. Ordering the gallery in
the admin therefore orders the wall; no new admin control is needed.

**Frames.** Every tile is a 5:7 frame with the image covering it. This matches
the character pieces exactly and crops a square piece on its sides.

**Desktop (`lg` and up).** The wall is a panel on the right of the hero,
running to the right edge of the viewport and from under the nav to the bottom
of the hero. Three columns of tiles. Columns one and three drift up, column two
drifts down, each as a seamless loop (the tiles are rendered twice in the
track; the second copy is hidden from assistive technology and from the tab
order). One loop takes about 80 seconds. The panel's top and bottom edges fade
out with a CSS mask on the panel itself; nothing is painted over the artwork.

**Phone and tablet (below `lg`).** One horizontal row of tiles directly under
the buttons, drifting left as a loop, bleeding off both screen edges. Tile width
is about 42vw, so two and a half tiles show. The row sits within the first
844px of a 390px-wide screen together with the headline and the main button.

**Interaction.** A tile is a button. Activating it opens the existing
`Lightbox` on that image, with the wall's images as the set, which carries the
"commission this" link to the service. The drift pauses while the pointer is
over the wall or focus is inside it, and while the wall is off screen.

**Reduced motion.** No drift: the columns and the row are static, the row
scrolls by hand.

**Loading.** Tiles use `SmartImage`. The gallery images are currently hosted on
third-party CDNs (Behance, DeviantArt), so they render as plain images at their
original size and cannot be resized by the site; an image uploaded to the
site's own media library would be resized by `next/image` (`sizes` is
`(min-width: 1024px) 16vw, 42vw`). The first six tiles load at once; the rest
load lazily.

## 5. Sections

### 5.1 Commission menu

Heading: `settings.servicesSectionEyebrow` and `settings.servicesSectionTitle`,
with the existing "All services" link.

One row per published service, all of them, in service order. A row is an
`article` with:

- **Availability badge and category** (existing `AvailabilityBadge`).
- **Title** (`h3`, `.display-md`), linking to `/services/[slug]`.
- **Description**, body size.
- **Packages.** Up to three packages in stored order as a short list, name and
  price ("Bust Up — $35"). When there are more, a last line "+N more".
- **Price and time.** "From $N" and "N+ days", from the same helpers the
  service card uses. A service with no packages shows "Quote on request".
- **Samples.** Up to four images in 5:7 frames: the gallery images filed under
  the service, then the service's own manual samples. They open the `Lightbox`
  with `showServices={false}`. A service with fewer than two samples shows its
  cover instead, uncropped at the cover's own proportions and capped in height
  (covers on the live site are 4:3, 16:9 and portrait, so a fixed frame cut
  some of them); with no cover either, the sample area is omitted and the text
  spans the row.
- **Actions.** A filled button → `/services/[slug]`, reading "Order" while the
  service is open, "Join the waitlist" on waitlist and "See details" when
  closed; and "See works" → `/gallery?service=[slug]` when the service has
  gallery images.

Layout: from `lg`, text on the left and samples on the right (5 and 7 of 12
columns; 4 and 8 from `xl`, so the tiles are larger), rows separated by
hairlines. Below `lg` a row reads title, then the samples as a horizontally
scrollable strip, then the prices and the button. Below `sm` the description is
hidden and the package prices run as one line instead of a list.

The home page no longer uses `ServiceCard`; `/services` keeps it.

### 5.2 How it works

Heading: `settings.processSectionEyebrow` and `settings.processSectionTitle`.
Body: the existing `ProcessSteps` with `settings.processSteps`, on the inverted
band, two across on phones (a new `dense` option; the Services page keeps its
own copy of this section, unchanged).

Under the steps, a row of up to three assurances:

- "N revision rounds included": the lowest revision count across all packages,
  omitted when zero.
- "Sketch approval before color": shown only when every published service that
  lists packages has a package feature that mentions a sketch. A quote-only
  service lists none and is ignored.
- "Work starts once the invoice is paid": fixed text. It describes how the
  site's request flow works and matches every service's terms.

### 5.3 Selected projects, retainer, testimonials

- **Selected projects.** `settings.workSectionEyebrow` and
  `settings.workSectionTitle`, the "All work" link, and the first four featured
  projects through the existing `ProjectsGrid` (two columns at every width on
  the home page, no filter). Was six. `/work` is unchanged.
- **Retainer.** Existing `RetainerBand`, unchanged.
- **Testimonials.** Existing `Testimonials` component, showing the lead quote
  and two cards on the home page. Was the lead quote and four. `Testimonials`
  gains a `limit` prop for the number of cards; its default stays four.

### 5.4 Questions

Heading: eyebrow "FAQ", title "Before you order". Body: the existing
`ServicesFaq` component.

Items: `settings.servicesFaq` when it has entries. Otherwise these five, which
are composed only from the terms and FAQs already published on the service
pages:

| Question | Answer |
|---|---|
| How long does it take? | Seven days or more, depending on the size of the piece and my queue. I confirm a delivery date in your quote, before you pay. Rush delivery is +50%. |
| How do I pay? | Once we agree on the scope, I send an invoice. Work starts when it is paid. |
| How many revisions do I get? | Most commissions include two rounds, mostly at the sketch stage, and you approve the sketch before I move to color. A major redesign after approval counts as new work. |
| What do you need from me? | Your character sheet or description, any references, the pose and mood you want, and where the art will be used. |
| Can I use the art commercially? | It depends on the commission, and each service page lists what its license covers. D&D character art includes use in streams, videos and socials. MTG and Pokémon card art is for personal use only. |

These defaults apply to the home page only. They are fixed text: if the terms
change, the owner replaces them by filling "Services FAQ" in the admin, which
also shows that list on `/services` as it does today.

## 6. Motion

One new signature, used on the wall tiles and the menu samples:

**Card tilt.** While a fine pointer is over a tile, the tile rotates a few
degrees toward the pointer in 3D and a soft highlight follows the pointer
across it, like tilting a foil card. It eases back on leave. It is not applied
on touch devices (`hover: none`) or under reduced motion, and it does not
change layout.

Also: the wall drift (4.2), a line-by-line mask reveal of the headline on load,
and the existing `Reveal` on sections. All durations and easings come from the
existing motion tokens.

## 7. Components

| Unit | Job | Depends on |
|---|---|---|
| `src/lib/home.ts` (new) | Pure rules: wall selection, hero facts and status, package lines, samples per service, assurances, FAQ fallback, default headline | data types only |
| `components/home/HomeHero.tsx` (new, server) | Copy column and layout of the wall hero | `home.ts`, `ArtWall`, `ProofLine`, `MagneticButton` |
| `components/home/HomeFaq.tsx` (new, server) | FAQ section layout | `ServicesFaq` |
| `components/media/SmartImage.tsx` | Gains an opt-in `lazy` for plain images | — |
| `components/home/ArtWall.tsx` (new, client) | Drifting columns or row, pause rules, lightbox state | `TiltCard`, `SmartImage`, `Lightbox` |
| `components/home/TiltCard.tsx` (new, client) | Pointer tilt and highlight around any child | — |
| `components/home/CommissionMenu.tsx` (new, server) | One row per service | `home.ts`, `SampleStrip`, `AvailabilityBadge` |
| `components/home/SampleStrip.tsx` (new, client) | A service's samples and their lightbox | `TiltCard`, `SmartImage`, `Lightbox` |
| `components/hero/Hero.tsx` | Unchanged; the slider hero | — |
| `components/reviews/Testimonials.tsx` | Gains `limit` | — |
| `components/work/ProjectsGrid.tsx`, `components/services/ProcessSteps.tsx` | Gain `dense` (two across on phones), off by default | — |
| `app/(site)/page.tsx` | Loads data, picks the hero, lays out the sections | all of the above |

`page.tsx` additionally loads `getGalleryItems()`. Sample lists per service are
built from that one result; no per-service query is added.

## 8. Data and admin

One new site setting, `heroStyle: "wall" | "slider"`.

- Migration `0042_hero_style.sql` adds `hero_style text not null default 'wall'`
  to `site_settings`, with a check constraint on the two values. Additive.
- `getSiteSettings()` returns `"wall"` when the column does not exist or holds
  anything else, so the code deploys safely before the migration is applied.
- The admin Home page gains a "Hero style" select at the top of "Hero image or
  video", with a hint that the art wall is filled from the gallery. The
  headline field's hint changes to say a blank headline uses the default in
  wall mode and the wordmark in slider mode.
- `hero_style` joins the columns a save may skip when the migration has not
  been applied, following the existing pattern.
- The migration is committed but **not applied** to the live database by this
  work. Until it is applied the hero is the art wall and the select cannot be
  saved.

## 9. Errors and edge cases

- Fewer than six eligible wall images, or `heroStyle = "slider"`: slider hero.
- Supabase not configured (local preview on placeholder data): the gallery is
  empty, so the slider hero renders; the menu renders the placeholder services
  without samples.
- A gallery image that fails to load: the tile shows the raised-surface
  background; no broken-image icon, no layout shift, since the frame has a fixed
  ratio.
- A service with one package, no packages, no delivery time, or no samples:
  each part is omitted on its own (5.1).
- An image filed under two services: it counts once for the wall, under the
  first of its services in service order, and appears in both services' menu
  samples.
- Keyboard: every tile and sample is a focusable button; focus pauses the
  drift; the duplicated loop tiles are not focusable.
- Both themes: every new component uses the existing tokens and is checked in
  light and dark, including inside `.tone-invert`.

## 10. Testing and verification

- Unit tests (`tsx --test`, `src/lib/home.test.ts`) for every rule in
  `home.ts`: wall round-robin, limit and exclusions; facts and status with
  empty, partial and mixed-availability services; package lines with one, three
  and four packages; samples fallbacks; assurances; FAQ fallback.
- `npm run lint`, `npm test`, `npm run build` pass.
- The page is run locally against the live content, read-only, and captured at
  1440px and 390px in light and dark, before and after. The phone page height
  is recorded.
- Reduced-motion pass and a keyboard pass on the wall, the samples and the FAQ.
- Per `AGENTS.md`, the relevant guides in `node_modules/next/dist/docs/` are
  read before touching `next/image` usage or the page's data loading.

## 11. Delivery

One draft pull request from `claude/zen-goldberg-bsad0s`, committed so that
each commit leaves the site working: rules and tests, hero and wall, commission
menu, remaining sections, setting + migration + admin field.

## 12. Notes for the owner (content, not code)

- There are no reviews from commission buyers. Three to five short ones would
  strengthen this page more than any layout change.
- Pokémon has one gallery sample and Emotes has none, so those menu rows show a
  single cover until more are filed under them.
- Gallery images have no titles or client names, so the lightbox shows the
  image and the service link only.
- The nav labels "Portofolio", "Project" and "Service" are set in the admin.
- The two hero buttons currently read "Commission me" and "Start a Project".
  Pointing the second at the gallery ("See the gallery" → `/gallery`) would
  make them two different actions.
