import type { Metadata } from "next";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import SectionBand from "@/components/layout/SectionBand";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/motion/Reveal";
import InquiryForm from "@/components/contact/InquiryForm";
import FlowImage from "@/components/media/FlowImage";
import JsonLd from "@/components/seo/JsonLd";
import TrackOnView from "@/components/analytics/TrackOnView";
import { getProjects } from "@/lib/data/projects";
import { mediaThumbnail } from "@/lib/media";
import { projectImageLabel } from "@/lib/alt-text";
import { formatUSD } from "@/lib/services/storefront";
import { STUDIO_PACKAGES, budgetBucket, milestoneLabel, packageInquiryMessage, packagePrice } from "@/lib/studio-packages";
import { breadcrumbSchema, personRef } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site-url";

/*
  For studios and creators who buy art by the project: a card set for a
  Kickstarter, a cast for a campaign, a launch kit. Fixed scope and price,
  paid in milestones, commercial use included. Ends in an inquiry already
  set up for the package picked.
*/

export const metadata: Metadata = {
  title: "Illustration projects for studios & creators",
  description:
    "Card sets, character casts and campaign art for TTRPG publishers, indie TCG and Kickstarter games, VTubers and brands. Fixed price, paid in milestones, commercial use included.",
  alternates: { canonical: "/studios" },
};

const SEGMENTS = [
  {
    title: "TTRPG publishers & campaigns",
    body: "Character casts, NPC portraits and key art for adventures, supplements, live-play shows and West Marches servers.",
  },
  {
    title: "Indie TCG & Kickstarter games",
    body: "A full set of card illustrations in one consistent style, delivered in batches, with print and crowdfunding use included.",
  },
  {
    title: "VTuber agencies & streamers",
    body: "Character art for a whole group, emote sets and stream graphics, planned as one project.",
  },
  {
    title: "Brands & communities",
    body: "Event key visuals, merch graphics and social media design for brands, streetwear labels and communities.",
  },
];

const STEPS = [
  { title: "Tell me about the project", body: "Send the inquiry below: what you're making, how many pieces, and your deadline." },
  { title: "Brief and quotation", body: "We agree the style, scope and schedule. I send a quotation with the price and milestones." },
  { title: "Deposit and kickoff", body: "The first milestone payment reserves the work in my schedule, and sketches start." },
  { title: "Batches and milestones", body: "You review sketches, then finished pieces in batches. Each milestone is invoiced as it's reached." },
];

const FAQ = [
  {
    q: "Why packages instead of a monthly retainer?",
    a: "Most teams buy art per project: a deck, a cast, a launch. A package gives you a fixed scope and price up front, paid in milestones, without paying for months you don't need art.",
  },
  {
    q: "Can we sell products with the art?",
    a: "Yes. Every package includes commercial use for your own products and promotion: merch, print runs, crowdfunding, ads. Fan art of characters you don't own stays personal use.",
  },
  {
    q: "How do revisions work on a set?",
    a: "Each piece gets up to two rounds at the sketch stage and one round of small fixes at line art and color. A style guide agreed at the start keeps the whole set consistent.",
  },
  {
    q: "We need art every month. Can we do that?",
    a: "Yes, ongoing work is available on request as a retainer with its own agreement. Tell me your volume in the inquiry.",
  },
  {
    q: "Do you use AI?",
    a: "No. Every piece is drawn by hand, and the art may not be used to train or prompt AI models.",
  },
];

const PROOF = [
  { slug: "orcbardwmg", note: "Character sample for a game company's landing page." },
  { slug: "ashoakriver", note: "A returning client, back every week or two for more cards." },
  { slug: "tmm-artworks", note: "Seven characters in one consistent style, in two weeks." },
];

export default async function StudiosPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const [{ package: picked }, projects] = await Promise.all([searchParams, getProjects()]);
  const pickedPackage = STUDIO_PACKAGES.find((p) => p.id === picked);
  const proof = PROOF.flatMap(({ slug, note }) => {
    const project = projects.find((p) => p.slug === slug);
    return project ? [{ project, note }] : [];
  });
  const lowest = Math.min(...STUDIO_PACKAGES.flatMap((p) => packagePrice(p) ?? []));

  return (
    <div>
      <TrackOnView event="view_item" params={{ item_id: "studios", item_name: "Studio packages", value: lowest, currency: "USD" }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Illustration projects for studios & creators",
          serviceType: "Commission illustration",
          url: `${SITE_URL}/studios`,
          provider: personRef,
          areaServed: "Worldwide",
          offers: STUDIO_PACKAGES.flatMap((p) => {
            const price = packagePrice(p);
            return price === null
              ? []
              : [
                  {
                    "@type": "Offer",
                    name: p.name,
                    description: `${p.pieces}. ${p.pitch}`,
                    url: `${SITE_URL}/studios?package=${p.id}`,
                    price,
                    priceCurrency: "USD",
                    seller: personRef,
                  },
                ];
          }),
        }}
      />
      <JsonLd data={breadcrumbSchema([{ name: "Services", path: "/services" }, { name: "Studios", path: "/studios" }])} />

      {/* Hero */}
      <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
        <Reveal className="flex max-w-3xl flex-col items-start gap-6">
          <p className="eyebrow eyebrow-accent">For studios & creators</p>
          <h1 className="display-lg">Illustration projects for games, campaigns and channels</h1>
          <p className="max-w-2xl text-body-lg text-pretty text-ink-muted">
            Card sets, character casts and campaign art, planned as one project: a fixed scope and price, paid in
            milestones, in one consistent hand-drawn style. Commercial use included.
          </p>
          <div className="flex flex-wrap gap-3">
            <MagneticButton href="#packages" size="lg" arrow>
              See the packages
            </MagneticButton>
            <MagneticButton href="#inquiry" size="lg" variant="secondary">
              Start an inquiry
            </MagneticButton>
          </div>
          <p className="text-body-sm text-ink-muted">Packages from {formatUSD(lowest)} · paid in milestones</p>
        </Reveal>
      </div>

      {/* Who it's for */}
      <div className="border-t border-line">
        <div className="container-page py-[var(--space-section)]">
          <SectionHeader index={1} eyebrow="Who it's for" title="For teams that ship art in sets" />
          <div className="grid gap-6 sm:grid-cols-2">
            {SEGMENTS.map((s, i) => (
              <Reveal key={s.title} delay={i * 60} className="flex flex-col gap-3 border-t border-line pt-5">
                <h3 className="display-sm">{s.title}</h3>
                <p className="text-body text-pretty text-ink-muted">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Packages */}
      <SectionBand tone="invert" id="packages">
        <SectionHeader
          index={2}
          eyebrow="Packages"
          title="Pick a starting point"
          description="Prices include commercial use. Your exact price and schedule are confirmed in the quotation."
        />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {STUDIO_PACKAGES.map((p, i) => {
            const price = packagePrice(p);
            return (
              <Reveal key={p.id} delay={i * 60} className="flex flex-col gap-5 border border-line p-6">
                <div className="flex flex-col gap-2">
                  <h3 className="display-sm">{p.name}</h3>
                  <p className="text-body-sm text-ink-muted">{p.pitch}</p>
                </div>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  {price === null ? (
                    <span className="display-sm">By quote</span>
                  ) : (
                    <>
                      <span className="text-body-sm text-ink-muted">From</span>
                      <span className="display-md tabular-nums">{formatUSD(price)}</span>
                    </>
                  )}
                </p>
                <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-[13px]">
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-ink-muted">Includes</dt>
                    <dd className="text-ink">{p.pieces}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-ink-muted">Timeline</dt>
                    <dd className="text-ink">{p.timeline}</dd>
                  </div>
                  {price !== null && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <dt className="text-ink-muted">Payment</dt>
                      <dd className="text-ink">{milestoneLabel(price)}</dd>
                    </div>
                  )}
                </dl>
                <ul className="flex flex-col gap-2.5 text-body-sm text-ink">
                  {p.includes.map((line) => (
                    <li key={line} className="flex gap-3">
                      <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-1.5 shrink-0 bg-accent" />
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="text-body-sm text-ink-muted">
                  <span className="text-ink">Best for:</span> {p.bestFor}
                </p>
                <span data-track="select_item" data-track-item-id={`studio-${p.id}`} className="mt-auto self-start pt-2">
                  <MagneticButton href={`/studios?package=${p.id}#inquiry`} arrow>
                    {price === null ? "Get a quote" : "Start with this package"}
                  </MagneticButton>
                </span>
              </Reveal>
            );
          })}
        </div>
      </SectionBand>

      {/* How it works */}
      <div className="container-page py-[var(--space-section)]">
        <SectionHeader index={3} eyebrow="How it works" title="From first message to final files" />
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 60} className="flex flex-col gap-3 border-t border-line pt-5">
              <span className="mono-meta text-ink">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display-sm">{s.title}</h3>
              <p className="text-body-sm text-pretty text-ink-muted">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>

      {/* Proof */}
      {proof.length > 0 && (
        <div className="border-t border-line">
          <div className="container-page py-[var(--space-section)]">
            <SectionHeader
              index={4}
              eyebrow="Work"
              title="Studios and repeat clients"
              action={
                <Link href="/work" className="label hover:text-ink">
                  All work →
                </Link>
              }
            />
            <ul className="grid gap-6 sm:grid-cols-3">
              {proof.map(({ project, note }) => (
                <li key={project.slug}>
                  <Link href={`/work/${project.slug}`} className="group flex flex-col gap-3">
                    <span className="relative block aspect-[4/3] overflow-hidden border border-line bg-bg-raised transition-colors group-hover:border-ink">
                      <FlowImage
                        src={mediaThumbnail(project.cover)}
                        alt={projectImageLabel(project)}
                        sizes="(min-width: 640px) 30vw, 100vw"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="display-sm group-hover:text-accent-strong">{project.title}</span>
                    <span className="text-body-sm text-ink-muted">{note}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Terms + FAQ */}
      <div className="border-t border-line bg-bg-raised/60">
        <div className="container-page grid gap-12 py-[var(--space-section)] lg:grid-cols-2">
          <div>
            <SectionHeader index={5} eyebrow="Terms" title="The short version" />
            <ul className="flex flex-col gap-3 text-body text-pretty text-ink">
              <li>Fixed scope and price, agreed in a quotation before any work starts.</li>
              <li>Paid in milestones: USD 150–1,000 in two halves, larger projects 40 / 30 / 30.</li>
              <li>Commercial use included; fan art of characters you don&apos;t own stays personal use.</li>
              <li>Per piece: up to 2 sketch rounds and 1 round of small fixes at line art and color.</li>
              <li>Pieces added later are quoted at the package rate.</li>
            </ul>
            <p className="mt-5 text-body-sm text-ink-muted">
              Full details in the{" "}
              <Link href="/terms#at-a-glance" className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent">
                commission terms
              </Link>
              .
            </p>
          </div>
          <div>
            <SectionHeader index={6} eyebrow="FAQ" title="Before you ask" />
            <div className="flex flex-col divide-y divide-line border-y border-line">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="cursor-pointer list-none text-body font-medium text-ink marker:hidden">
                    <span className="flex items-baseline justify-between gap-4">
                      {item.q}
                      <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="pt-3 text-body-sm text-pretty text-ink-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inquiry */}
      <div id="inquiry" className="container-page scroll-mt-24 py-[var(--space-section)]">
        <SectionHeader
          index={7}
          eyebrow="Inquiry"
          title="Tell me about your project"
          description="Replies within 2 working days, with questions or a quotation."
        />
        <div className="max-w-2xl">
          <InquiryForm
            key={picked ?? "any"}
            initialProjectType={pickedPackage?.projectType ?? ""}
            initialBudget={budgetBucket(pickedPackage ? packagePrice(pickedPackage) : null)}
            initialMessage={packageInquiryMessage(picked)}
          />
        </div>
      </div>
    </div>
  );
}
