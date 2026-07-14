"use client";

import { useState } from "react";
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
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-[var(--z-nav)]">
      <div className="flex items-center justify-between border-b border-line/60 bg-bg/80 px-6 py-4 backdrop-blur-md sm:px-10">
        <Link
          href="/"
          data-cursor="view"
          aria-label="Home"
          className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink"
          onClick={() => setOpen(false)}
        >
          {logoType === "image" && logoUrl ? (
            <ThemedLogo
              darkUrl={logoUrl}
              lightUrl={logoUrlLight}
              className="h-8 w-auto max-w-[180px] object-contain"
            />
          ) : (
            logoText
          )}
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted sm:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          {availabilityStatus ?? "Open for work"}
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-cursor="view"
              className={cn(
                "group relative font-mono text-label uppercase tracking-[0.15em] text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-ink",
                pathname === link.href && "text-accent",
              )}
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-accent transition-[width] duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <div className="sm:hidden">
            <ThemeToggle />
          </div>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative z-[var(--z-nav)] flex h-8 w-8 flex-col items-center justify-center gap-1.5"
          >
            <span
              className={cn(
                "block h-px w-6 bg-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
                open && "translate-y-[3.5px] rotate-45",
              )}
            />
            <span
              className={cn(
                "block h-px w-6 bg-ink transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)]",
                open && "-translate-y-[3.5px] -rotate-45",
              )}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: easeFreeze }}
            className="fixed inset-x-0 top-[73px] h-[calc(100svh-73px)] overflow-y-auto bg-bg px-6 py-10 md:hidden"
          >
            <div className="flex flex-col gap-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="font-display text-display-sm uppercase text-ink transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
