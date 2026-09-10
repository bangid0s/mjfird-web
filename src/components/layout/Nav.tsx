"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { easeFreeze } from "@/lib/motion";
import ThemeToggle from "@/components/ui/ThemeToggle";
import ThemedLogo from "@/components/ui/ThemedLogo";

type NavLink = { label: string; href: string };

/*
  No pill, no card, no chrome — letterspaced micro-caps sitting on the page
  with a hairline under them, which is what the bar looks like in the
  reference. The active route is marked with a short accent rule rather than a
  filled background.
*/

export default function Nav({
  availabilityStatus,
  logoUrl,
  logoUrlLight,
  logoType = "text",
  logoText = "MJFIRD",
  links,
}: {
  availabilityStatus?: string;
  logoUrl?: string | null;
  logoUrlLight?: string | null;
  logoType?: "text" | "image";
  logoText?: string;
  links: NavLink[];
}) {
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const pathname = usePathname();

  // Lenis drives the real scroll position, so a plain scroll listener is still
  // the right signal here. The bar takes a ground as soon as the page moves,
  // and gets out of the way when reading downward.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setLifted(y > 8);
      setHidden(y > 240 && y > lastY.current);
      lastY.current = y;
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
          lifted || open ? "border-line bg-bg/90 backdrop-blur-md" : "border-transparent",
        )}
      >
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

          <nav className="hidden items-center gap-9 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-cursor="view"
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "spec relative py-1 transition-colors duration-[var(--duration-fast)]",
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

          <div className="flex shrink-0 items-center gap-5">
            {availabilityStatus && (
              <span className="spec hidden items-center gap-2 lg:inline-flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70 motion-reduce:hidden" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                {availabilityStatus}
              </span>
            )}

            <ThemeToggle />

            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center text-ink md:hidden"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: easeFreeze }}
            className="border-b border-line bg-bg md:hidden"
          >
            <div className="container-page py-2">
              {links.map((link, i) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-baseline gap-4 border-b border-line py-4 last:border-b-0",
                    pathname === link.href ? "text-ink" : "text-ink-muted",
                  )}
                >
                  <span className="mono-meta w-6 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="display-sm flex-1">{link.label}</span>
                  <span aria-hidden="true" className="text-ink-faint">
                    ↗
                  </span>
                </Link>
              ))}

              {availabilityStatus && (
                <p className="spec flex items-center gap-2 py-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {availabilityStatus}
                </p>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
