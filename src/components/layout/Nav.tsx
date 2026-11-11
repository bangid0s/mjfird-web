"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { easeFreeze } from "@/lib/motion";
import ThemeToggle from "@/components/ui/ThemeToggle";
import ThemedLogo from "@/components/ui/ThemedLogo";
import AccountLink from "@/components/layout/AccountLink";
import { partitionNavLinks } from "@/lib/nav-links";

type NavLink = { label: string; href: string };

/*
  No pill, no card, no chrome — plain links sitting on the page with a
  hairline under them, and one filled button for the thing a visitor came to
  do. The active route is marked with a short accent rule rather than a filled
  background.
*/

export default function Nav({
  logoUrl,
  logoUrlLight,
  logoType = "text",
  logoText = "MJFIRD",
  links,
  contactEmail,
  socials = [],
}: {
  logoUrl?: string | null;
  logoUrlLight?: string | null;
  logoType?: "text" | "image";
  logoText?: string;
  links: NavLink[];
  contactEmail?: string;
  socials?: { label: string; url: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const progressRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();
  // The bar carries up to six links and one button; the rest live in the sheet
  // and the footer. /contact is the button, so it never appears as a plain link.
  const { primary, overflow } = partitionNavLinks(links, 6);
  const sheetLinks = [...primary, ...overflow];

  // Lenis drives the real scroll position, so a plain scroll listener is still
  // the right signal here. The bar takes a ground as soon as the page moves,
  // and gets out of the way when reading downward.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setLifted(y > 8);
      setHidden(y > 240 && y > lastY.current);
      lastY.current = y;
      // Reading progress, written straight to the style so scrolling never
      // re-renders the bar.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A route change while the sheet is open should close it. Adjusting during
  // render (rather than in an effect) is React's own pattern for this, and it
  // catches back/forward navigation that never touches a link handler.
  const [sheetRoute, setSheetRoute] = useState(pathname);
  if (sheetRoute !== pathname) {
    setSheetRoute(pathname);
    setOpen(false);
  }

  // Don't let the page scroll behind the mobile sheet.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[var(--z-nav)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-swing)]",
        hidden && !open && "-translate-y-full",
      )}
    >
      <div
        className={cn(
          "border-b transition-colors duration-[var(--duration-base)] ease-[var(--ease-swing)]",
          "relative",
          lifted || open ? "border-line bg-bg/90 backdrop-blur-md" : "border-transparent",
        )}
      >
        <span
          ref={progressRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-accent transition-opacity duration-[var(--duration-base)]",
            lifted && !open ? "opacity-100" : "opacity-0",
          )}
        />
        <div className="container-page flex h-[var(--nav-h)] items-center justify-between gap-6">
          <Link
            href="/"
            data-cursor="view"
            aria-label="Home"
            className="shrink-0 font-display text-lg font-semibold tracking-[-0.04em] text-ink"
          >
            {logoType === "image" && logoUrl ? (
              <ThemedLogo
                darkUrl={logoUrl}
                lightUrl={logoUrlLight}
                className="h-7 w-auto max-w-[150px] object-contain"
              />
            ) : (
              logoText
            )}
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex xl:gap-8">
            {primary.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-cursor="view"
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "label relative py-1 transition-colors duration-[var(--duration-fast)]",
                    active ? "text-ink" : "hover:text-ink",
                  )}
                >
                  {link.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active-rule"
                      transition={{ duration: 0.32, ease: easeFreeze }}
                      className="absolute -bottom-0.5 left-0 h-px w-full bg-accent"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-4 lg:gap-5">
            <AccountLink className="hidden lg:inline" />

            <Link
              href="/services"
              data-cursor="view"
              aria-current={pathname === "/services" ? "page" : undefined}
              className="hidden items-center bg-accent px-4 py-2.5 font-body text-body-sm font-medium text-accent-ink transition-[filter] duration-[var(--duration-fast)] hover:brightness-110 sm:inline-flex"
            >
              Commission me
            </Link>

            <ThemeToggle />

            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center text-ink lg:hidden"
            >
              <span className="relative block h-3 w-5">
                <span
                  className={cn(
                    "absolute left-0 block h-px w-5 bg-current transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
                    open ? "top-[6px] rotate-45" : "top-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-px w-5 bg-current transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
                    open ? "top-[6px] -rotate-45" : "top-[11px]",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: easeFreeze }}
            className="flex h-[calc(100svh-var(--nav-h))] flex-col overflow-y-auto border-b border-line bg-bg lg:hidden"
          >
            <div className="container-page flex flex-1 flex-col py-2">
              {sheetLinks.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, ease: easeFreeze, delay: 0.04 + i * 0.035 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={cn(
                      "group flex items-baseline gap-4 border-b border-line py-4",
                      pathname === link.href ? "text-ink" : "text-ink-muted",
                    )}
                  >
                    <span className="mono-meta w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="display-md flex-1 transition-colors group-active:text-accent">
                      {link.label}
                    </span>
                    {pathname === link.href ? (
                      <span aria-hidden="true" className="h-2 w-2 shrink-0 self-center bg-accent" />
                    ) : (
                      <span aria-hidden="true" className="text-ink-faint">
                        ↗
                      </span>
                    )}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 + sheetLinks.length * 0.035 }}
                className="mt-auto flex flex-col gap-6 pb-8 pt-10"
              >
                <Link
                  href="/services"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center bg-accent px-5 py-4 font-body text-body font-medium text-accent-ink"
                >
                  Commission me
                </Link>
                <AccountLink className="text-ink" onNavigate={() => setOpen(false)} />
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="display-sm underline decoration-line-strong decoration-1 underline-offset-4"
                  >
                    {contactEmail}
                  </a>
                )}
                {socials.length > 0 && (
                  <ul className="flex flex-wrap gap-x-6 gap-y-2">
                    {socials.map((social) => (
                      <li key={social.url}>
                        <a href={social.url} target="_blank" rel="noopener noreferrer" className="label hover:text-ink">
                          {social.label} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
