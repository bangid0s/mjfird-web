import Link from "next/link";
import { SITE_HOST } from "@/lib/site-url";
import { cn } from "@/lib/cn";
import ThemeToggle from "@/components/ui/ThemeToggle";
import FooterClock from "@/components/links/FooterClock";
import EscapeToHome from "@/components/standalone/EscapeToHome";

const WIDTHS = {
  narrow: "max-w-2xl lg:max-w-4xl",
  medium: "max-w-2xl lg:max-w-5xl",
  wide: "max-w-2xl lg:max-w-6xl",
} as const;

/**
 * The pane every page outside the site chrome wears (/links, /resume,
 * /gallery). No nav, no footer — a titled sheet with a way back.
 *
 * Studio Spec, like the rest of the site: hard edges, hairline rules, mono
 * spec labels. The title bar reads as a path (host / page) so the way home is
 * the first thing on it, not a keyboard shortcut you have to know about.
 */
export default function StandaloneWindow({
  title,
  width = "narrow",
  bleed = false,
  backdrop,
  hints,
  actions,
  className,
  children,
}: {
  title: string;
  /** `wide` gives the gallery room for four masonry columns. */
  width?: keyof typeof WIDTHS;
  /**
   * Drop the inner padding so children can run edge to edge — for pages laid
   * out in full-width bands, which then own their own padding.
   */
  bleed?: boolean;
  /** Full-bleed media behind the pane (the /links background). */
  backdrop?: React.ReactNode;
  /** Extra keyboard hints for the status bar, beside ESC. */
  hints?: React.ReactNode;
  /** Extra controls for the title bar, before the theme toggle. */
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  // Strip the "// " prefix the admin titles have carried historically — the
  // path separator in the bar now does that job.
  const label = title.replace(/^\/\/\s*/, "");

  return (
    <div className="relative min-h-svh bg-bg px-3 py-4 text-ink sm:px-6 sm:py-10 print:min-h-0 print:bg-white print:p-0">
      <EscapeToHome />
      {backdrop}

      <main
        className={cn(
          "page-enter relative z-10 mx-auto w-full border border-line bg-bg-raised/80 backdrop-blur-md print:max-w-none print:border-0 print:bg-transparent print:backdrop-blur-none",
          WIDTHS[width],
          className,
        )}
      >
        {/* ---------- Title bar ---------- */}
        <div className="flex h-12 items-center justify-between gap-4 border-b border-line px-4 sm:px-6 print:hidden">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 font-mono text-label">
            <Link
              href="/"
              className="group flex shrink-0 items-center gap-1.5 text-ink-faint transition-colors duration-[var(--duration-fast)] hover:text-ink"
            >
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:-translate-x-0.5"
              >
                ←
              </span>
              {SITE_HOST}
            </Link>
            <span aria-hidden="true" className="text-line-strong">
              /
            </span>
            <span aria-current="page" className="truncate text-ink">
              {label}
            </span>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <ThemeToggle />
          </div>
        </div>

        <div
          className={
            bleed ? "flex flex-col" : "flex flex-col gap-4 p-3 sm:p-5 lg:gap-5 lg:p-6"
          }
        >
          {children}
        </div>

        {/* ---------- Status bar ---------- */}
        <div className="flex h-11 items-center justify-between gap-4 border-t border-line px-4 sm:px-6 print:hidden">
          <div className="flex items-center gap-4">
            {hints}
            <span className="hidden items-center gap-2 sm:flex">
              <kbd className="border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                ESC
              </kbd>
              <span className="font-mono text-label text-ink-faint">Back home</span>
            </span>
          </div>
          <FooterClock />
        </div>
      </main>
    </div>
  );
}
