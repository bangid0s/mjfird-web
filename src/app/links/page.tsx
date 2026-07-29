import type { Metadata } from "next";
import Link from "next/link";
import { Silkscreen } from "next/font/google";
import { getProfile } from "@/lib/data/profile";
import { getLinkItems } from "@/lib/data/links";
import { getSiteSettings } from "@/lib/data/site-settings";
import { getTestimonials } from "@/lib/data/testimonials";
import { SITE_HOST } from "@/lib/site-url";
import { getStudioStatus, parseOpenDays, type StudioHours } from "@/lib/studio-hours";
import ThemeToggle from "@/components/ui/ThemeToggle";
import HeroMedia from "@/components/hero/HeroMedia";
import StudioStatusBar from "@/components/links/StudioStatus";
import LinksTabs, { type LinksTab } from "@/components/links/LinksTabs";
import LinkList from "@/components/links/LinkList";
import BrandStrip from "@/components/links/BrandStrip";
import FooterClock from "@/components/links/FooterClock";

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
  const [profile, links, settings, testimonials] = await Promise.all([
    getProfile(),
    getLinkItems(),
    getSiteSettings(),
    getTestimonials(),
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

  // Only offer a tab when there's something behind it.
  const tabs: LinksTab[] = [];
  const panels: Record<string, React.ReactNode> = {};

  if (linkItems.length > 0) {
    tabs.push({ id: "links", label: "Links" });
    panels.links = <LinkList items={linkItems} />;
  }
  if (shopItems.length > 0) {
    tabs.push({ id: "shop", label: "Shop" });
    panels.shop = <LinkList items={shopItems} />;
  }
  if (testimonials.length > 0) {
    tabs.push({ id: "reviews", label: "Reviews" });
    panels.reviews = (
      <ul className="flex flex-col gap-3">
        {testimonials.map((testimonial, i) => (
          <li key={`${testimonial.name}-${i}`} className="rounded-2xl bg-bg-raised p-5">
            <p className="font-body text-body-sm leading-relaxed text-ink">
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <p className="mt-3 font-mono text-label uppercase tracking-[0.15em] text-ink-faint">
              {testimonial.name}
              {testimonial.role && <span className="text-ink-faint/70"> — {testimonial.role}</span>}
            </p>
          </li>
        ))}
      </ul>
    );
  }
  if (profile.bio || settings.aboutSkills.length > 0) {
    tabs.push({ id: "about", label: "About" });
    panels.about = (
      <div className="flex flex-col gap-5">
        {profile.bio && (
          <p className="font-body text-body-sm leading-relaxed text-ink-muted">{profile.bio}</p>
        )}
        {settings.aboutSkills.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {settings.aboutSkills.map((skill) => (
              <li
                key={skill}
                className="rounded-lg bg-bg-raised px-3 py-1.5 font-mono text-label text-ink-muted"
              >
                {skill}
              </li>
            ))}
          </ul>
        )}
        {profile.socials.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {profile.socials.map((social) => (
              <a
                key={social.url}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted transition-colors hover:text-accent"
              >
                {social.label} →
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${pixel.variable} relative min-h-svh bg-bg px-3 py-6 text-ink sm:px-6 sm:py-10`}>
      {settings.linksBgType !== "none" && settings.linksBgUrl && (
        <HeroMedia
          type={settings.linksBgType}
          url={settings.linksBgUrl}
          overlayOpacity={settings.linksOverlayOpacity}
        />
      )}

      <main className="relative z-10 mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-bg-raised/60 backdrop-blur-sm">
        {/* Window chrome */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <span className="truncate font-mono text-label text-ink-muted">
            {settings.linksWindowTitle}
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span aria-hidden="true" className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-error/60" />
              <span className="h-3 w-3 rounded-full bg-accent-echo/60" />
              <span className="h-3 w-3 rounded-full bg-success/60" />
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-3 pb-3 sm:px-5 sm:pb-5">
          {/* Identity */}
          <section className="flex flex-col gap-5 rounded-2xl bg-bg-raised p-5 sm:flex-row sm:gap-6">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-28 w-28 shrink-0 rounded-xl border border-line object-cover sm:h-36 sm:w-36"
              />
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border border-line bg-bg font-[family-name:var(--font-silkscreen)] text-2xl text-accent sm:h-36 sm:w-36">
                {headline.slice(0, 1)}
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <h1 className="font-[family-name:var(--font-silkscreen)] text-2xl leading-tight text-ink sm:text-3xl">
                {headline}
              </h1>
              {settings.linksRunBy && (
                <p className="font-body text-body-sm text-ink-faint">
                  Run By: {settings.linksRunBy}
                </p>
              )}
              {introLines.length > 0 && (
                <div className="flex flex-col">
                  {introLines.map((line, i) => (
                    <p key={i} className="font-body text-body-sm text-ink-muted">
                      {line}
                    </p>
                  ))}
                </div>
              )}
              <Link
                href={settings.linksCtaUrl || "/contact"}
                className="mt-2 rounded-xl bg-accent px-6 py-3.5 text-center font-body text-body-sm font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85"
              >
                {settings.linksCtaLabel}
              </Link>
            </div>
          </section>

          {settings.linksShowStatus && <StudioStatusBar hours={hours} initial={status} />}

          <BrandStrip
            brands={settings.linksBrands}
            slots={settings.linksBrandSlots}
            ctaUrl={settings.linksBrandCtaUrl}
          />

          <LinksTabs tabs={tabs} panels={panels} />

          {settings.linksTags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {settings.linksTags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-lg bg-bg-raised px-3 py-1.5 font-body text-label text-ink-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Window status bar */}
        <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <kbd className="rounded bg-bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                ← →
              </kbd>
              <span className="font-mono text-label text-ink-faint">Navigate</span>
            </span>
            <span className="hidden items-center gap-2 sm:flex">
              <kbd className="rounded bg-bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                ESC
              </kbd>
              <Link href="/" className="font-mono text-label text-ink-faint hover:text-ink">
                {SITE_HOST}
              </Link>
            </span>
          </div>
          <FooterClock />
        </div>
      </main>
    </div>
  );
}
