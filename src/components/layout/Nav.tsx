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
  // the right signal here. The bar lifts onto a surface as soon as the page
  // moves, and gets out of the way when reading downward.
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
      <div className="container-page py-3">
        <div
          className={cn(
            "flex h-12 items-center justify-between gap-3 rounded-full border px-2 pl-4 transition-[background-color,border-color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-swing)]",
            lifted || open
              ? "border-line bg-bg/80 shadow-sm backdrop-blur-xl"
              : "border-transparent bg-transparent",
          )}
        >
          <Link
            href="/"
            data-cursor="view"
            aria-label="Home"
            className="shrink-0 font-display text-lg font-semibold tracking-[-0.03em] text-ink"
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

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-cursor="view"
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative isolate rounded-full px-3.5 py-2 text-body-sm font-medium transition-colors duration-[var(--duration-fast)]",
                    active ? "text-ink" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ duration: 0.32, ease: easeFreeze }}
                      className="absolute inset-0 -z-10 rounded-full bg-bg-raised-2"
                    />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            {availabilityStatus && (
              <span className="mr-1 hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-label font-medium text-ink-muted lg:inline-flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70 motion-reduce:hidden" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
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
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors duration-[var(--duration-fast)] hover:bg-bg-raised-2 md:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={cn(
                    "absolute left-0 block h-[1.5px] w-4 rounded-full bg-current transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
                    open ? "top-[5px] rotate-45" : "top-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-[1.5px] w-4 rounded-full bg-current transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
                    open ? "top-[5px] -rotate-45" : "top-[10px]",
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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: easeFreeze }}
            className="container-page md:hidden"
          >
            <div className="surface mt-1 overflow-hidden p-2 shadow-lg">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-[calc(var(--radius-lg)-0.5rem)] px-4 py-3.5 font-display text-display-sm transition-colors duration-[var(--duration-fast)]",
                    pathname === link.href
                      ? "bg-bg-raised-2 text-ink"
                      : "text-ink-muted hover:bg-bg-raised-2 hover:text-ink",
                  )}
                >
                  {link.label}
                  <span aria-hidden="true" className="text-ink-faint">
                    ↗
                  </span>
                </Link>
              ))}

              {availabilityStatus && (
                <p className="flex items-center gap-2 px-4 pb-2 pt-4 text-label font-medium text-ink-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
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
