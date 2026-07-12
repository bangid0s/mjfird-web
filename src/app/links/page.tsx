import type { Metadata } from "next";
import Link from "next/link";
import { getProfile } from "@/lib/data/profile";
import { getLinkItems } from "@/lib/data/links";
import { getSiteSettings } from "@/lib/data/site-settings";
import { cn } from "@/lib/cn";
import { SITE_HOST } from "@/lib/site-url";
import ThemeToggle from "@/components/ui/ThemeToggle";
import ThemedLogo from "@/components/ui/ThemedLogo";

export const metadata: Metadata = {
  title: "Links",
  description: "Everything MJFIRD, one tap away.",
};

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

export default async function LinksPage() {
  const [profile, links, settings] = await Promise.all([
    getProfile(),
    getLinkItems(),
    getSiteSettings(),
  ]);

  const wordmark =
    settings.logoType === "text" ? settings.logoText : profile.name;

  return (
    <div className="relative flex min-h-svh flex-col bg-bg text-ink">
      {/* Signature tilted accent strip */}
      <div className="relative h-2 w-full overflow-hidden">
        <div className="absolute -inset-x-4 top-1/2 h-3 -translate-y-1/2 -rotate-1 bg-accent/90" />
      </div>

      <div className="absolute right-4 top-6">
        <ThemeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-14">
        {/* Identity */}
        <header
          className="flex flex-col items-center gap-4 text-center motion-safe:animate-rise"
          style={{ animationDelay: "0ms" }}
        >
          {settings.logoType === "image" && settings.logoUrl ? (
            <ThemedLogo
              darkUrl={settings.logoUrl}
              lightUrl={settings.logoUrlLight}
              className="h-14 w-auto max-w-[220px] object-contain"
            />
          ) : profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="h-20 w-20 rounded-full border border-line object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-bg-raised font-display text-2xl uppercase text-accent">
              {wordmark.slice(0, 1)}
            </div>
          )}

          <h1 className="font-display text-display-sm uppercase leading-none">{wordmark}</h1>
          <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-muted">
            {profile.tagline}
          </p>

          <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            {profile.availabilityStatus}
          </span>
        </header>

        {/* Link buttons */}
        <nav className="mt-12 flex flex-col gap-4" aria-label="Links">
          {links.map((link, i) => {
            const external = isExternal(link.url);
            const inner = (
              <>
                <span className="flex min-w-0 items-center gap-3">
                  {link.emoji && <span className="text-lg leading-none">{link.emoji}</span>}
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-body-sm font-medium uppercase tracking-[0.15em]">
                      {link.label}
                    </span>
                    {link.description && (
                      <span
                        className={cn(
                          "mt-0.5 block truncate font-body text-label",
                          link.highlight ? "text-accent-ink/70" : "text-ink-muted",
                        )}
                      >
                        {link.description}
                      </span>
                    )}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="shrink-0 transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
                >
                  →
                </span>
              </>
            );

            const classes = cn(
              "group flex items-center justify-between gap-4 px-5 py-4 transition-colors duration-[var(--duration-fast)] motion-safe:animate-rise",
              link.highlight
                ? "bg-accent text-accent-ink hover:bg-ink hover:text-bg"
                : "border border-line text-ink hover:border-accent hover:text-accent",
            );
            const delay = { animationDelay: `${80 + i * 70}ms` };

            return external ? (
              <a
                key={`${link.label}-${i}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={classes}
                style={delay}
              >
                {inner}
              </a>
            ) : (
              <Link key={`${link.label}-${i}`} href={link.url} className={classes} style={delay}>
                {inner}
              </Link>
            );
          })}
        </nav>

        {/* Socials */}
        {profile.socials.length > 0 && (
          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 motion-safe:animate-rise"
            style={{ animationDelay: `${120 + links.length * 70}ms` }}
          >
            {profile.socials.map((social) => (
              <a
                key={social.url}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted transition-colors hover:text-accent"
              >
                {social.label}
              </a>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer
          className="mt-auto pt-14 text-center motion-safe:animate-rise"
          style={{ animationDelay: `${200 + links.length * 70}ms` }}
        >
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-faint transition-colors hover:text-ink"
          >
            {SITE_HOST} →
          </Link>
        </footer>
      </main>

      <div className="relative h-2 w-full overflow-hidden">
        <div className="absolute -inset-x-4 top-1/2 h-3 -translate-y-1/2 rotate-1 bg-accent/90" />
      </div>
    </div>
  );
}
