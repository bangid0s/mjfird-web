import type { Metadata } from "next";
import Link from "next/link";
import { Silkscreen } from "next/font/google";
import { getProfile } from "@/lib/data/profile";
import { getLinkItems } from "@/lib/data/links";
import { getSiteSettings } from "@/lib/data/site-settings";
import { getProjects } from "@/lib/data/projects";
import { getStorefrontServices } from "@/lib/data/services";
import { effectiveAvailability, formatUSD, startingPrice } from "@/lib/services/storefront";
import { getStudioStatus, parseOpenDays, type StudioHours } from "@/lib/studio-hours";
import Analytics from "@/components/analytics/Analytics";
import ShareButton from "@/components/ui/ShareButton";
import SocialIcon from "@/components/ui/SocialIcon";
import StandaloneWindow from "@/components/standalone/StandaloneWindow";
import Avatar from "@/components/ui/Avatar";
import SmartImage from "@/components/media/SmartImage";
import LinksBackdrop from "@/components/links/LinksBackdrop";
import IntroText from "@/components/links/IntroText";
import StudioStatusBar from "@/components/links/StudioStatus";
import LinksTabs, { type LinksTab } from "@/components/links/LinksTabs";
import LinkBento from "@/components/links/LinkBento";
import BrandStrip from "@/components/links/BrandStrip";

// Scoped to this route only — the rest of the site keeps its own type stack.
const pixel = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Links",
  description: "Everything MJFIRD, one tap away.",
};

const sectionLink =
  "inline-flex min-h-11 items-center text-body-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:decoration-accent";

export default async function LinksPage() {
  const [profile, links, settings, services, projects] = await Promise.all([
    getProfile(),
    getLinkItems(),
    getSiteSettings(),
    getStorefrontServices(),
    getProjects(),
  ]);

  const headline =
    settings.linksHeadline || (settings.logoType === "text" ? settings.logoText : profile.name);
  const introLines = (settings.linksIntro || profile.tagline).split("\n").filter(Boolean);

  const hours: StudioHours = {
    timezone: settings.linksTimezone,
    openTime: settings.linksOpenTime,
    closeTime: settings.linksCloseTime,
    openDays: parseOpenDays(settings.linksOpenDays),
  };
  const status = getStudioStatus(hours);

  const linkItems = links.filter((item) => item.tab === "links");
  const shopItems = links.filter((item) => item.tab === "shop");

  // Only offer a tab when there's something behind it; with a single tab the
  // bar hides itself and the panel just renders.
  const tabs: LinksTab[] = [];
  const panels: Record<string, React.ReactNode> = {};

  if (linkItems.length > 0) {
    tabs.push({ id: "links", label: "Links", count: linkItems.length });
    panels.links = <LinkBento items={linkItems} />;
  }
  if (shopItems.length > 0) {
    tabs.push({ id: "shop", label: "Shop", count: shopItems.length });
    panels.shop = <LinkBento items={shopItems} />;
  }

  const panelCount = tabs.length;
  const windowTitle = settings.linksWindowTitle.replace(/^\/\/\s*/, "").trim();

  // What a visitor can buy and what the work looks like, pulled from the rest
  // of the site so a page with three links still has somewhere to go.
  const offers = services
    .map((service) => ({
      service,
      from: startingPrice(service.packages),
      availability: effectiveAvailability(service.availability, service.slotsTotal, service.slotsTaken),
    }))
    .filter((offer) => offer.availability !== "closed")
    .slice(0, 4);
  const work = (projects.some((p) => p.featured) ? projects.filter((p) => p.featured) : projects)
    .filter((p) => p.cover && !p.cover.startsWith("/placeholder"))
    .slice(0, 3);

  return (
    <div className={pixel.variable}>
      <StandaloneWindow
        title="Links"
        width="medium"
        backdrop={
          settings.linksBgType !== "none" && settings.linksBgUrl ? (
            <LinksBackdrop
              type={settings.linksBgType}
              url={settings.linksBgUrl}
              overlayOpacity={settings.linksOverlayOpacity}
            />
          ) : undefined
        }
        actions={<ShareButton title={headline} label="Share" className="hidden h-8 sm:inline-flex" />}
        hints={
          panelCount > 1 ? (
            <span className="flex items-center gap-2">
              <kbd className="border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                ← →
              </kbd>
              <span className="font-mono text-label text-ink-faint">Switch tab</span>
            </span>
          ) : undefined
        }
      >
        {/* ---------- Identity ----------
            On a phone this is the whole first screen's budget: portrait and
            name share a row, the intro is held to two lines and the tags to
            one, so the first links are in view without scrolling. */}
        <section className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-3 border border-line bg-bg p-4 sm:gap-x-6 sm:gap-y-4 sm:p-6 lg:gap-x-8">
          <div className="h-16 w-16 shrink-0 sm:row-span-2 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
            {profile.avatarUrl ? (
              <Avatar
                src={profile.avatarUrl}
                alt={profile.name}
                sizes="144px"
                className="h-full w-full border border-line"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center border border-line bg-bg-raised font-[family-name:var(--font-silkscreen)] text-3xl text-accent">
                {headline.slice(0, 1)}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-1 self-center sm:gap-2 sm:self-start">
            {/* The admin's window title ("// Welcome to") reads into the
                headline as its lead-in. */}
            {windowTitle && <p className="text-label text-ink-faint sm:text-body-sm">{windowTitle}</p>}
            <h1 className="font-[family-name:var(--font-silkscreen)] text-2xl leading-[1.05] text-ink sm:text-4xl">
              {headline}
            </h1>
            {settings.linksRunBy && (
              <p className="text-label text-ink-faint sm:text-body-sm">Run by {settings.linksRunBy}</p>
            )}
          </div>

          <div className="col-span-2 flex min-w-0 flex-col gap-3 sm:col-span-1 sm:col-start-2 sm:gap-4">
            <IntroText lines={introLines} />

            {settings.linksTags.length > 0 && (
              <ul
                aria-label="Disciplines"
                className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {settings.linksTags.map((tag) => (
                  <li
                    key={tag}
                    className="shrink-0 whitespace-nowrap border border-line px-2.5 py-1 text-label text-ink-muted"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <div className="flex gap-2">
                <Link
                  href={settings.linksCtaUrl || "/contact"}
                  className="inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap bg-accent px-4 text-body-sm font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85 sm:flex-none sm:px-6"
                >
                  {settings.linksCtaLabel}
                </Link>
                {/* The retainer is the offer worth the second button: it is
                    the one a visitor won't find by browsing the tiles. */}
                {settings.retainerEnabled && (
                  <Link
                    href="/contact?type=retainer"
                    className="inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap border border-line-strong px-4 text-body-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:border-ink sm:flex-none sm:px-6"
                  >
                    {settings.retainerTitle}
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {profile.socials.length > 0 && (
                  <nav aria-label="Social profiles" className="flex flex-wrap gap-1.5">
                    {profile.socials.map((social) => (
                      <a
                        key={social.url}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        title={social.label}
                        className="flex h-11 w-11 items-center justify-center border border-line text-ink-muted transition-colors duration-[var(--duration-fast)] hover:border-ink hover:text-ink"
                      >
                        <SocialIcon url={social.url} label={social.label} />
                      </a>
                    ))}
                  </nav>
                )}
                {/* The title-bar share is hidden on phones, so it lives here too. */}
                <ShareButton title={headline} label="Share" className="ml-auto h-11 sm:hidden" />
              </div>
            </div>
          </div>
        </section>

        {settings.linksShowStatus && <StudioStatusBar hours={hours} initial={status} />}

        <LinksTabs tabs={tabs} panels={panels} />

        {/* ---------- Services ---------- */}
        {offers.length > 0 && (
          <section aria-labelledby="links-services" className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4">
              <h2 id="links-services" className="text-body-sm font-medium text-ink-muted">
                Commission a piece
              </h2>
              <Link href="/services" className={sectionLink}>
                All services
              </Link>
            </div>
            <ul className="flex flex-col border border-line bg-bg-raised">
              {offers.map(({ service, from, availability }) => (
                <li key={service.slug} className="border-b border-line last:border-b-0">
                  <Link
                    href={`/services/${service.slug}`}
                    className="group flex min-h-14 items-center justify-between gap-4 px-4 py-3 transition-colors duration-[var(--duration-fast)] hover:bg-bg"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-body-sm font-medium text-ink sm:text-body">{service.title}</span>
                      {availability === "waitlist" && (
                        <span className="text-label text-ink-faint">Waitlist open</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {from !== null && (
                        <span className="text-body-sm text-ink-muted">
                          from <span className="font-medium tabular-nums text-ink">{formatUSD(from)}</span>
                        </span>
                      )}
                      <span
                        aria-hidden="true"
                        className="text-ink-faint transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1 group-hover:text-accent-strong"
                      >
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------- Recent work ---------- */}
        {work.length > 0 && (
          <section aria-labelledby="links-work" className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4">
              <h2 id="links-work" className="text-body-sm font-medium text-ink-muted">
                Recent work
              </h2>
              <Link href="/work" className={sectionLink}>
                All {projects.length} projects
              </Link>
            </div>
            <ul className="grid grid-cols-3 gap-2 sm:gap-3">
              {work.map((project) => (
                <li key={project.slug} className="min-w-0">
                  <Link href={`/work/${project.slug}`} className="group flex flex-col gap-2">
                    <span className="relative block aspect-[4/5] w-full overflow-hidden border border-line bg-bg-raised-2 transition-colors duration-[var(--duration-fast)] group-hover:border-ink sm:aspect-[4/3]">
                      <SmartImage
                        src={project.cover}
                        alt=""
                        sizes="(min-width: 1024px) 20rem, 33vw"
                        className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="truncate text-label text-ink sm:text-body-sm">{project.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <BrandStrip
          brands={settings.linksBrands}
          slots={settings.linksBrandSlots}
          ctaUrl={settings.linksBrandCtaUrl}
        />
      </StandaloneWindow>

      <Analytics measurementId={settings.gaMeasurementId} />
    </div>
  );
}
