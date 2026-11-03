import type { Metadata } from "next";
import Link from "next/link";
import { Silkscreen } from "next/font/google";
import { getProfile } from "@/lib/data/profile";
import { getLinkItems } from "@/lib/data/links";
import { getSiteSettings } from "@/lib/data/site-settings";
import { getStudioStatus, parseOpenDays, type StudioHours } from "@/lib/studio-hours";
import Analytics from "@/components/analytics/Analytics";
import ShareButton from "@/components/ui/ShareButton";
import SocialIcon from "@/components/ui/SocialIcon";
import StandaloneWindow from "@/components/standalone/StandaloneWindow";
import Avatar from "@/components/ui/Avatar";
import HeroMedia from "@/components/hero/HeroMedia";
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

export default async function LinksPage() {
  const [profile, links, settings] = await Promise.all([
    getProfile(),
    getLinkItems(),
    getSiteSettings(),
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

  return (
    <div className={pixel.variable}>
      <StandaloneWindow
        title="Links"
        width="medium"
        backdrop={
          settings.linksBgType !== "none" && settings.linksBgUrl ? (
            <HeroMedia
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
        {/* ---------- Identity ---------- */}
        <section className="relative grid gap-5 border border-line bg-bg p-4 sm:grid-cols-[auto_1fr] sm:gap-6 sm:p-6 lg:gap-8">
          <div className="relative h-24 w-24 shrink-0 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
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
            {/* Live dot on the portrait — the same signal as the status strip,
                where a visitor's eye lands first. */}
            {settings.linksShowStatus && (
              <span
                aria-hidden="true"
                className={`absolute -bottom-1 -right-1 h-4 w-4 border-2 border-bg ${
                  status.open ? "bg-success" : "bg-ink-faint"
                }`}
              />
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              {/* The admin's window title ("// Welcome to") reads into the
                  headline as its lead-in, now the title bar is a breadcrumb. */}
              {windowTitle && (
                <p className="font-mono text-label uppercase tracking-[0.18em] text-ink-faint">
                  {windowTitle}
                </p>
              )}
              <h1 className="font-[family-name:var(--font-silkscreen)] text-[1.75rem] leading-[1.05] text-ink sm:text-4xl">
                {headline}
              </h1>
              {settings.linksRunBy && (
                <p className="font-body text-body-sm text-ink-faint">Run by {settings.linksRunBy}</p>
              )}
              {introLines.length > 0 && (
                <div className="flex max-w-xl flex-col gap-0.5">
                  {introLines.map((line, i) => (
                    <p key={i} className="font-body text-body-sm text-ink-muted sm:text-body">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {settings.linksTags.length > 0 && (
              <ul aria-label="Disciplines" className="flex flex-wrap gap-1.5">
                {settings.linksTags.map((tag) => (
                  <li
                    key={tag}
                    className="border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <Link
                  href={settings.linksCtaUrl || "/contact"}
                  className="group inline-flex h-11 flex-1 items-center justify-center gap-3 bg-accent px-6 font-mono text-label uppercase tracking-[0.15em] text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85 sm:flex-none"
                >
                  {settings.linksCtaLabel}
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
                {/* The title-bar share is hidden on phones, so it lives here too. */}
                <ShareButton title={headline} label="Share" className="h-11 sm:hidden" />
              </div>

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
            </div>
          </div>
        </section>

        {settings.linksShowStatus && <StudioStatusBar hours={hours} initial={status} />}

        <LinksTabs tabs={tabs} panels={panels} />

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
