# MJFIRD — Premium ("$10k-Tier") Website PRD

> **What this document is.** An elevated product spec for a portfolio site built to *agency-grade, award-caliber* standards — the level of craft you'd expect from a $10,000 custom build. It raises the ceiling on the earlier PRD in the areas that separate a premium site from a template: **custom art direction, a signature motion/interaction language, immersive case studies, engineered performance, and a documented design system.**
>
> It pairs with two companion files: the base PRD (full data schema, IA, feature detail) and the Website Copy deck. Where this doc references the schema or CMS, see the base PRD.
>
> **How to read "$10k":** treated here as a *quality bar*, not a price tag — you're building it yourself in Antigravity + Claude Fable 5. Section 13–14 also frame it as a real premium scope, so the doc doubles as a brief you could hand to a developer.

| The premium bar, at a glance | |
|---|---|
| **Design** | Fully bespoke art direction. No template smell. A real design system with tokens. |
| **Motion** | A consistent, signature interaction language — preloader, page transitions, scroll-driven reveals, custom cursor, microinteractions. |
| **Signature moment** | One "wow" interaction tied to your bboy identity (options in §3.2). |
| **Case studies** | Immersive, story-driven, multiple bespoke layouts — not just image grids. |
| **Performance** | Engineered to hit "good" Core Web Vitals *despite* the motion. |
| **Craft details** | Preloader, custom 404, easter eggs, refined empty/loading states, opt-in sound. |
| **Standard** | Built to a stated quality bar you could submit to Awwwards / CSS Design Awards (§16). |

---

## 1. The bar we're building to

A $10k site earns its keep in three ways: it **wins work** (a prospect feels your craft before they read a word), it **gets noticed** (shareable, submittable, memorable), and it **lasts** (a system that ages well, not a trend that dates in a year).

Every decision in this doc serves one idea: **the site is the strongest thing in your portfolio.** If someone screenshots it, it should look like a case study. If they scroll it, it should feel like a set — deliberate, rhythmic, alive.

**Non-negotiables at this tier**
- Original art direction (no off-the-shelf theme, no generic component kit look).
- A single, coherent motion language applied consistently — not random animations.
- Immersive project pages that tell a story.
- Real performance and accessibility engineering (motion never breaks either).
- A documented design system so the site stays consistent as you add to it.

---

## 2. Goals & success metrics

**Goals (elevated)**
1. **Convert** the right visitors into qualified inquiries with an experience that pre-sells your taste.
2. **Impress** — be the kind of site people share, bookmark, and remember.
3. **Express** a distinct, ownable brand with your bboy identity as its heartbeat.
4. **Endure** — a design system you can extend for years without it falling apart.
5. **Be recognizable** — built to a standard that could earn a design-awards feature.

**Success metrics**
- Qualified inquiries / month (primary).
- Inquiry completion rate; project-page dwell time and scroll depth.
- Shares / referral traffic / direct returning visitors ("came back to show someone").
- Core Web Vitals in the "good" band on mid-tier mobile.
- Lighthouse ≥ 90 Performance / ≥ 95 Accessibility / 100 Best-Practices–SEO (targets).
- Optional vanity-but-real signal: accepted to a design gallery (Awwwards/CSSDA/FWA).

---

## 3. The premium design concept

### 3.1 Art-direction principles
- **Editorial + kinetic.** Oversized, confident typography. Big imagery. A strong, visible grid used as a design feature — then broken on purpose for tension.
- **Restraint with one loud move.** A disciplined palette and layout, plus one signature element that carries the personality (§3.2). Premium ≠ busy.
- **Type as the hero.** A distinctive display face for impact, a clean workhorse for body, a deliberate type scale. Typography does most of the branding.
- **Motion as identity, not decoration.** Everything moves with the same "physics" (easing, timing, rhythm). Consistency is what reads as expensive.
- **Detail everywhere.** Hover states, focus states, loading states, empty states, transitions — nothing left default.

### 3.2 Signature interaction — pick one (your "wow" moment)
This is the single element that makes the site unmistakably *yours*, drawn from breaking. Choose one to build well rather than several half-built:

- **A) Kinetic wordmark.** On load, your name/hero type assembles like a set starting — letters snap in with motion-blur, then subtly react to cursor/scroll (echoing toprock rhythm). High impact, moderate effort. *Recommended default.*
- **B) Freeze-frame reveals.** Imagery and sections "freeze" into place — a beat of motion blur, then a hard stop, like nailing a freeze. Applied site-wide as the reveal language. Elegant, performant.
- **C) Reactive figure (WebGL).** A cursor/scroll-reactive silhouette or particle figure that moves like a breaker in the hero. Biggest "wow," highest effort — isolate it for performance and always ship a static fallback.
- **D) Beat-driven scroll.** Reveals timed to a subtle rhythm, with a metronome-style scroll/progress indicator. Understated, distinctive, cheap to run.

*(You can combine A + B affordably; save C for the hero only.)*

### 3.3 Typography, color, theme
- **Type:** 1 display + 1 body (+ optional mono for labels/meta). Define scale, weights, tracking, line-height. Consider a variable font for smooth kinetic effects.
- **Color:** dark-first palette recommended for visual work — deep neutral base, off-white text, one electric accent. Keep it tight (≤ 4 core values + neutrals).
- **Theme:** ship one strong theme done perfectly. Dark/light toggle is a *nice-to-have*, not a priority.

### 3.4 Design system (documented)
Build the site on tokens, not one-off values. Document as you go (a `/styleguide` route or a Figma file — your call).
- **Tokens:** color, type scale, spacing scale, radii, shadows, motion durations/easings, breakpoints, z-index.
- **Components:** nav (+ mobile), footer, buttons (primary/secondary/ghost/**magnetic**), links, project card, filter chips, media gallery/lightbox, marquee, testimonial, service card, blog card, tag pills, inquiry form + field states, availability badge, section headers, CTA band, preloader, custom cursor, admin table/form, status badges, image uploader.
- **States:** default / hover / focus / active / disabled / loading / empty / error — for every interactive component.

---

## 4. Motion & interaction design (the premium differentiator)

A single motion language, applied everywhere. This is where most of the "$10k feel" lives.

**Motion principles**
- One easing family, a small set of durations (e.g., fast ~200ms, base ~400ms, expressive ~700ms). Consistency > novelty.
- Motion has *purpose*: guide the eye, express brand rhythm, reward interaction. Never block reading or delay content.
- **`prefers-reduced-motion` is a first-class path**, not an afterthought — full, tested fallbacks with content still perfect.

**The motion system**
- **Preloader.** A brief, on-brand intro (kinetic wordmark or a % counter) that sets tone and masks first load. Skippable; only on first visit (session-cached).
- **Page transitions.** Smooth transitions between routes (View Transitions API where supported, Framer Motion otherwise) so navigation feels like one continuous piece.
- **Smooth scroll + scroll-driven reveals.** Lenis for buttery scroll; GSAP ScrollTrigger for reveals, parallax, pinned sections, and horizontal-scroll moments in case studies.
- **Signature hero interaction** (from §3.2).
- **Microinteractions.** Magnetic buttons, link underenlines/hover states, image hover zoom/reveal, marquees, animated numbers, cursor-aware elements.
- **Custom cursor.** Contextual states: default, "View" (over projects), "Drag" (over galleries), "Play" (over video). Auto-disable on touch devices.
- **Sound design (optional, opt-in).** Subtle UI ticks/whooshes with a persistent mute toggle, default off. A premium touch — never autoplay.

**Libraries:** GSAP (+ ScrollTrigger), Lenis, Framer Motion; React Three Fiber / Three.js *only* if you choose signature option C (kept isolated).

---

## 5. Immersive case studies

The single biggest gap between a cheap portfolio and a $10k one. Each project should read like a short film, not a folder.

**Story structure (per project)**
1. **Immersive open** — full-bleed hero (image/video), title, one-line hook.
2. **Context** — client, year, role, the problem in a sentence or two.
3. **The move** — your thinking and the key decision, shown through work.
4. **The build** — process, iterations, details, systems (this proves craft).
5. **The result** — what shipped, reception, why it matters.
6. **Next** — seamless transition to the next project.

**Bespoke layout kit (build ~3 reusable templates):**
- **Editorial** — text + image rhythm, generous whitespace, pull quotes.
- **Immersive/full-bleed** — big visuals, parallax, sticky captions, motion reveals.
- **Systems** — grids showing an identity across applications (great for brand work).

Rich-media support throughout: full-bleed images, video embeds, before/after sliders, horizontal-scroll galleries, device mockups, color/type specimen blocks. All authored from the CMS (see §7).

---

## 6. Information architecture

Same map as the base PRD, elevated in execution:
```
/  ·  /work  ·  /work/[slug]  ·  /services  ·  /about  ·  /dance  ·  /blog  ·  /blog/[slug]  ·  /contact
/styleguide (design-system reference)  ·  /privacy  ·  /404  ·  /sitemap.xml  ·  /robots.txt  ·  /rss.xml
Admin (protected): /admin → dashboard · projects · services · blog · inquiries · testimonials · dance · profile
```

---

## 7. Feature set (premium touches)

Full functional detail lives in the base PRD. Premium additions:

**Public**
- Signature hero + full motion system (§4).
- Immersive case-study templates (§5).
- Filterable work with animated transitions.
- Custom cursor, magnetic buttons, marquees, animated stats.
- Dynamic OG images per project/post.

**CMS / Admin (zero-code, elevated)**
- Everything from the base PRD, plus:
- **Draft preview** — view unpublished pages exactly as they'll look before publishing.
- **Scheduled publishing** — set a go-live date/time for posts/projects.
- **Media handling** — multi-image upload, drag-reorder, and **focal-point cropping** so images frame well across layouts.
- **Layout choice per project** — pick which case-study template a project uses.
- **Reorder & feature** — drag to order; toggle featured.

---

## 8. Content & art-direction requirements

Premium sites live or die on asset quality. Plan for:
- **Photography/artwork standards:** high-resolution, consistent treatment (color grade, crop ratios). Shoot or source cover images intentionally — mismatched quality reads as cheap instantly.
- **Case-study assets:** process shots, detail crops, application mockups, short motion clips.
- **Bboy media:** a well-cut reel (embed from YouTube/Vimeo), plus a few strong stills.
- **OG/social images:** branded default + per-project/post.
- **Iconography:** one consistent set (custom or a single library).
- **Favicon/app icons** in all sizes.

*(This is the work only you can do — the build can be flawless and still look budget if the assets are weak.)*

---

## 9. Technical architecture

Builds on the base PRD stack, plus the motion/perf layer.

- **Core:** Next.js (App Router) + TypeScript + Tailwind CSS.
- **Backend:** Supabase (Postgres + Auth + Storage). Data schema per base PRD §7.
- **Hosting:** Vercel (or Firebase/Cloud Run to stay in Google's ecosystem).
- **Motion:** GSAP + ScrollTrigger, Lenis, Framer Motion; optional React Three Fiber for signature option C.
- **Email:** Resend (inquiry notifications). **Spam:** Cloudflare Turnstile.
- **Image pipeline:** Next/Image with AVIF/WebP, responsive `sizes`, blur-up placeholders; heavy galleries can add Cloudinary later.
- **Analytics:** Vercel Analytics or Plausible + event tracking (§12).
- **Env/secrets, deploy, backups:** per base PRD §8.

---

## 10. Performance budget (engineered, not hoped-for)

Motion and performance are both required — the craft is in doing both.

**Targets (mid-tier mobile)**
- LCP < 2.5s · CLS < 0.1 · INP < 200ms.
- Lighthouse Performance ≥ 90.
- Initial JS payload kept lean; heavy libs (WebGL) code-split and lazy-loaded only where used.

**How we hit them**
- Server-render/statically generate public pages; hydrate interactivity selectively.
- Optimize every image (format, size, lazy-load, placeholders); never ship an unoptimized hero.
- Isolate the signature WebGL moment; static fallback on low-power/reduced-motion.
- Defer non-critical motion; use `content-visibility` and intersection observers for reveals.
- Budget checks in the QA phase — a page that misses the budget doesn't ship.

---

## 11. Accessibility (WCAG 2.1 AA, motion-safe)

- Full `prefers-reduced-motion` fallbacks — content and hierarchy perfect without animation.
- Focus management across page transitions (focus lands sensibly after route change).
- Semantic HTML, alt text on all imagery, visible focus rings, full keyboard navigation.
- Color contrast meets AA (test the accent on the dark base).
- Custom cursor never removes real focus/hover affordances; disabled on touch.
- Sound is opt-in and clearly togglable.

---

## 12. SEO & analytics

- SSR/SSG, per-page metadata, canonical URLs, **dynamic OG images**, `sitemap.xml`, `robots.txt`, blog `rss.xml`.
- Structured data: `Person`, `Article`, `CreativeWork`, `BreadcrumbList`.
- Event tracking: `inquiry_started`, `inquiry_submitted`, `project_viewed`, `reel_played`, `cv_downloaded`, `outbound_social_click`.
- Awards-readiness: clean semantic markup and performance also help gallery acceptance.

---

## 13. Premium scope & deliverables

What "a $10k build" actually includes — use this as the definition of done, whether you DIY it to this standard or brief a developer:

1. **Discovery & strategy** — positioning, sitemap, content strategy, moodboards.
2. **Art direction** — 2 design directions explored → 1 refined and approved.
3. **Design system** — tokens + full component set with all states, documented.
4. **Motion & interaction design** — defined language + the signature moment.
5. **Fully custom, responsive build** — every page, mobile → desktop.
6. **Immersive case-study system** — ~3 bespoke templates.
7. **CMS + admin** — zero-code content management (with draft preview, scheduling, focal-point cropping).
8. **Performance engineering** — meet the §10 budget.
9. **Accessibility** — WCAG 2.1 AA.
10. **SEO + analytics** — per §12.
11. **QA** — cross-browser (Chrome/Safari/Firefox/Edge) + real-device testing.
12. **Launch + handover** — domain, deploy, env setup, and a short "how to run your site" guide.

---

## 14. Where the effort goes

Illustrative of how premium builds typically allocate work. If you DIY, this becomes your **time** budget, not money — plan accordingly and protect the design/motion phases, since that's where the "$10k feel" is earned.

| Phase | Share of effort |
|---|---|
| Discovery & strategy | ~10% |
| Art direction & design | ~30% |
| Motion & interaction (design + build) | ~20% |
| Frontend build (pages, responsive) | ~20% |
| CMS / backend / admin | ~12% |
| SEO, performance, a11y, QA, launch | ~8% |

*(General industry pattern, not a quote or financial advice — treat as a planning heuristic.)*

---

## 15. Timeline / phased roadmap

Premium builds run ~6–10 weeks with a team; DIY-with-agent shifts the balance (faster build, but design and content iteration still take real time). **MVP = Phases 0–3** from the base PRD; the phases below layer the premium craft on top.

- **Week 1 — Direction.** Lock positioning, sitemap, moodboards, type/color, and pick the signature concept (§3.2).
- **Weeks 2–3 — System + shell.** Design tokens + components; build the public shell and motion language (preloader, transitions, smooth scroll, cursor) on seed content.
- **Weeks 3–4 — Case studies.** Build the ~3 immersive templates; wire to CMS.
- **Weeks 4–5 — Backend.** Schema, admin auth, Projects/Blog/Services/Testimonials CRUD, inquiries inbox, profile. *(Launchable MVP here.)*
- **Week 6 — Signature + polish.** Ship the signature moment; microinteractions; bboy section.
- **Weeks 7–8 — Engineer + launch.** Performance budget, accessibility, SEO, analytics, cross-browser/device QA, launch, handover.

---

## 16. Quality bar — "done to $10k standard"

Ship only when these are true (this is also your Awwwards-submission checklist):
- [ ] Art direction is original — no template/component-kit smell.
- [ ] One coherent motion language, applied consistently across every page.
- [ ] The signature moment works, delights, and has a clean fallback.
- [ ] Case studies feel immersive and tell a story (not image dumps).
- [ ] Every interactive element has hover / focus / active / loading / empty / error states.
- [ ] Preloader, custom 404, and refined empty states are all handled.
- [ ] `prefers-reduced-motion` path is complete and tested.
- [ ] Core Web Vitals "good" on mid mobile; Lighthouse ≥ 90/95/100.
- [ ] WCAG 2.1 AA verified (contrast, keyboard, focus, alt text).
- [ ] Flawless on Chrome, Safari, Firefox, Edge + real phones.
- [ ] Every image optimized; no unoptimized hero anywhere.
- [ ] Dynamic OG images render correctly when shared.
- [ ] You can run the entire site from the admin with zero code.

---

## 17. Out of scope (v1) / future

Online payments & fixed-price checkout; client portal; print/merch shop; courses; multi-language; booking/scheduling. All clean add-ons later — the architecture supports growing into them.

---

# Appendix — Antigravity prompts for the premium layer

Run these *after* the base PRD's Phase 0–4 prompts (scaffold, shell, schema, CRUD, inquiries). Attach this doc so the agent has the motion spec and quality bar. One at a time; verify each in the browser preview.

**P-A — Motion foundation**
> Add the site-wide motion system per the Premium PRD §4: install Lenis for smooth scroll, GSAP + ScrollTrigger for scroll-driven reveals, and set up page transitions (View Transitions API with a Framer Motion fallback). Define one easing family and a small set of durations as design tokens. Implement a first-visit preloader (session-cached, skippable) and a contextual custom cursor (View / Drag / Play states, auto-disabled on touch). Implement a complete `prefers-reduced-motion` fallback for everything. Verify motion is consistent and reduced-motion is perfect.

**P-B — Signature moment**
> Implement signature concept [A: kinetic wordmark] from Premium PRD §3.2 in the hero: [describe — e.g., the hero type assembles on load with motion blur, then subtly reacts to cursor/scroll]. Keep it performant, isolate any heavy work, and ship a static fallback for low-power and reduced-motion. Verify it delights and never blocks content.

**P-C — Immersive case studies**
> Build the ~3 bespoke case-study templates from Premium PRD §5 (Editorial, Immersive/full-bleed, Systems) with parallax, sticky captions, horizontal-scroll galleries, and before/after sliders. Let each project pick its template from the CMS, and support all rich media (full-bleed images, video embeds, specimen blocks). Verify authoring works end-to-end from the admin.

**P-D — Microinteractions + polish**
> Add the microinteraction layer from Premium PRD §4: magnetic buttons, link/image hover states, marquees, and animated numbers. Add a custom 404 ("Lost the beat"), refined empty/loading states everywhere, and an optional opt-in UI-sound toggle (default off). Verify all interactive components have hover/focus/active/loading/empty/error states.

**P-E — Engineer to the bar**
> Do a performance, accessibility, and SEO pass to meet Premium PRD §10–12: optimize all images (AVIF/WebP, responsive sizes, blur placeholders), code-split heavy motion, target LCP < 2.5s / CLS < 0.1 / INP < 200ms and Lighthouse ≥ 90/95/100, verify WCAG 2.1 AA (contrast, keyboard, focus, alt text), add dynamic OG images, structured data, sitemap, and RSS. Test on Chrome/Safari/Firefox/Edge and report results against the §16 quality bar.

---

*A note in your own spirit: the whole point of a $10k-tier site is that it doesn't look like anyone else's. Study the greats for standards, then don't bite — make it move like only you can.*
