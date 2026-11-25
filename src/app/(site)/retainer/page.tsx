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
import { RETAINER_PLANS, RETAINER_TERMS, fromPrice, monthlyPrice, planInquiryMessage } from "@/lib/retainer";
import { breadcrumbSchema, personRef } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site-url";

/*
  The page for clients who need art every month: TTRPG publishers, indie card
  games, VTuber channels and brands. It answers what a buyer has to take back
  to their team (what's included, what it costs, how it runs, who else does
  this) and ends in an inquiry already filled in for the plan they picked.
*/

export const metadata: Metadata = {
  title: "Monthly illustration retainer",
  description:
    "A monthly illustrator for TTRPG publishers, indie TCG and Kickstarter card games, VTuber channels and brands. Hand-drawn, commercial use included, from $240 a month.",
  alternates: { canonical: "/retainer" },
};

const SEGMENTS = [
  {
    title: "TTRPG publishers & campaigns",
    body: "Character art, NPC portraits and key art for adventures, supplements, live-play shows and West Marches servers.",
  },
  {
    title: "Indie TCG & Kickstarter games",
    body: "Card illustrations in one consistent style, delivered month by month as your set grows, with print and crowdfunding use included.",
  },
  {
    title: "VTuber agencies & streamers",
    body: "Character art, emotes and stream graphics for talent that needs fresh visuals every month.",
  },
  {
    title: "Brands & communities",
    body: "Event key visuals, merch graphics and social media design for brands, streetwear labels and communities.",
  },
];

const STEPS = [
  { title: "Tell me about the project", body: "Send the inquiry below: what you're making, how much art a month, and when you want to start." },
  { title: "Brief and fit check", body: "A short call or chat to agree the style, volume and deadlines. I confirm the plan and the price in a quotation." },
  { title: "Agreement and first invoice", body: "We sign a simple retainer agreement. The month starts once its invoice is paid." },
  { title: "Monthly rhythm", body: "Briefs at the start of the month, sketches for your approval, final files on the agreed dates, invoiced on the 1st." },
];

const FAQ = [
  {
    q: "Can I try it before committing to a year?",
    a: "Yes. The 3-month starter lets us work together on a short term first. After that, 6 or 12 months bring the price down.",
  },
  {
    q: "What if we don't use the whole month's quota?",
    a: "Unused pieces roll over for one month, then expire. Anything above the quota is billed at your retainer rate, not one-off prices.",
  },
  {
    q: "Can we sell products with the art?",
    a: "Yes. Every retainer includes commercial use for your own products and promotion: merch, print runs, crowdfunding, ads. Fan art of characters you don't own stays personal use.",
  },
  {
    q: "Can we change plans or stop?",
    a: "Scope and plan changes are agreed in writing. Either side can end the retainer with 30 days' notice; ending a 12-month term before month 6 costs one month's fee.",
  },
  {
    q: "Do you use AI?",
    a: "No. Every piece is drawn by hand, and the art may not be used to train or prompt AI models.",
  },
];

const PROOF_SLUGS = [
  { slug: "orcbardwmg", note: "Character sample for a game company's landing page." },
  { slug: "ashoakriver", note: "A returning client, back every week or two for more cards." },
  { slug: "tmm-artworks", note: "Seven characters in one consistent style, in two weeks." },
];

export default async function RetainerPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const [{ plan }, projects] = await Promise.all([searchParams, getProjects()]);
  const proof = PROOF_SLUGS.flatMap(({ slug, note }) => {
    const project = projects.find((p) => p.slug === slug);
    return project ? [{ project, note }] : [];
  });

  return (
    <div>
      <TrackOnView event="view_item" params={{ item_id: "retainer", item_name: "Monthly retainer", value: fromPrice(RETAINER_PLANS[0]), currency: "USD" }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Monthly illustration retainer",
          serviceType: "Illustration retainer",
          url: `${SITE_URL}/retainer`,
          provider: personRef,
          areaServed: "Worldwide",
          offers: RETAINER_PLANS.map((p) => ({
            "@type": "Offer",
            name: p.name,
            description: p.pitch,
            url: `${SITE_URL}/retainer?plan=${p.id}`,
            priceCurrency: "USD",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: fromPrice(p),
              priceCurrency: "USD",
              unitText: "MONTH",
            },
            seller: personRef,
          })),
        }}
      />
      <JsonLd data={breadcrumbSchema([{ name: "Services", path: "/services" }, { name: "Retainer", path: "/retainer" }])} />

      {/* Hero */}
      <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
        <Reveal className="flex max-w-3xl flex-col items-start gap-6">
          <p className="eyebrow eyebrow-accent">Monthly retainer</p>
          <h1 className="display-lg">A monthly illustrator for your game, campaign or channel</h1>
          <p className="max-w-2xl text-body-lg text-pretty text-ink-muted">
            A reserved slot in my queue every month, one consistent hand-drawn style across everything you publish, and
            commercial use included. For studios that keep making things.
          </p>
          <div className="flex flex-wrap gap-3">
            <MagneticButton href="#plans" size="lg" arrow>
              See the plans
            </MagneticButton>
            <MagneticButton href="#inquiry" size="lg" variant="secondary">
              Start an inquiry
            </MagneticButton>
          </div>
          <p className="text-body-sm text-ink-muted">From {formatUSD(fromPrice(RETAINER_PLANS[0]))} a month · 3-month starter available</p>
        </Reveal>
      </div>

      {/* Who it's for */}
      <div className="border-t border-line">
        <div className="container-page py-[var(--space-section)]">
          <SectionHeader index={1} eyebrow="Who it's for" title="Built for teams with a steady pipeline" />
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

      {/* Plans */}
      <SectionBand tone="invert" id="plans">
        <SectionHeader
          index={2}
          eyebrow="Plans"
          title="Three ways to start"
          description="Prices are per month on a 12-month term, commercial use included. Your exact price is confirmed in the quotation."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {RETAINER_PLANS.map((p, i) => (
            <Reveal key={p.id} delay={i * 70} className="flex flex-col gap-5 border border-line p-6">
              <div className="flex flex-col gap-2">
                <h3 className="display-sm">{p.name}</h3>
                <p className="text-body-sm text-ink-muted">{p.pitch}</p>
              </div>
              <p className="flex items-baseline gap-2">
                <span className="text-body-sm text-ink-muted">From</span>
                <span className="display-md tabular-nums">{formatUSD(fromPrice(p))}</span>
                <span className="text-body-sm text-ink-muted">/ month</span>
              </p>
              <ul className="flex flex-col gap-2.5 border-t border-line pt-4 text-body-sm text-ink">
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
              <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
                <dl className="grid grid-cols-3 gap-2 text-[12px] text-ink-muted">
                  {RETAINER_TERMS.map((t) => (
                    <div key={t.months} className="flex flex-col">
                      <dt>{t.label}</dt>
                      <dd className="tabular-nums text-ink">{formatUSD(monthlyPrice(p, t))}</dd>
                    </div>
                  ))}
                </dl>
                <span data-track="select_item" data-track-item-id={`retainer-${p.id}`} className="self-start">
                  <MagneticButton href={`/retainer?plan=${p.id}#inquiry`} arrow>
                    Start with this plan
                  </MagneticButton>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-body-sm text-pretty text-ink-muted">
          Need a different mix (more pieces, design work, a fixed set of cards for a launch)? Tell me in the inquiry and
          I&apos;ll quote a custom plan.
        </p>
      </SectionBand>

      {/* How it works */}
      <div className="container-page py-[var(--space-section)]">
        <SectionHeader index={3} eyebrow="How it works" title="From first message to monthly rhythm" />
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
              <li>12 months: −15% · 6 months: −10% · 3-month starter: −5%, compared with one-off prices.</li>
              <li>Invoiced on the 1st, paid by the 5th; the month starts once paid.</li>
              <li>Unused pieces roll over for one month. Extra work is billed at your retainer rate.</li>
              <li>Commercial use included; fan art of characters you don&apos;t own stays personal use.</li>
              <li>30 days&apos; notice to stop.</li>
            </ul>
            <p className="mt-5 text-body-sm text-ink-muted">
              Full details in the{" "}
              <Link href="/terms#section-10" className="text-ink underline decoration-line-strong underline-offset-4 hover:text-accent">
                retainer terms
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
          title="Let's plan your month"
          description="Replies within 2 working days, with questions or a quotation."
        />
        <div className="max-w-2xl">
          <InquiryForm key={plan ?? "any"} initialProjectType="retainer" initialBudget="retainer" initialMessage={planInquiryMessage(plan)} />
        </div>
      </div>
    </div>
  );
}
