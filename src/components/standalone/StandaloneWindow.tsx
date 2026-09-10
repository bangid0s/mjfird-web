import Link from "next/link";
import { SITE_HOST } from "@/lib/site-url";
import ThemeToggle from "@/components/ui/ThemeToggle";
import FooterClock from "@/components/links/FooterClock";
import EscapeToHome from "@/components/standalone/EscapeToHome";

/**
 * The window frame /links wears, for the other pages that live outside the
 * site chrome. No nav, no footer — just a titled pane with a way back.
 */
export default function StandaloneWindow({
  title,
  width = "narrow",
  bleed = false,
  children,
}: {
  title: string;
  /** `wide` gives the gallery room for four masonry columns. */
  width?: "narrow" | "wide";
  /**
   * Drop the inner padding so children can run edge to edge — for pages laid
   * out in full-width colour bands, which then own their own padding.
   */
  bleed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh bg-bg px-3 py-6 text-ink sm:px-6 sm:py-10">
      <EscapeToHome />

      <main
        className={`relative z-10 mx-auto w-full overflow-hidden border border-line bg-bg-raised/60 backdrop-blur-sm ${
          width === "wide" ? "max-w-2xl lg:max-w-6xl" : "max-w-2xl lg:max-w-4xl"
        }`}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
          <span className="truncate font-mono text-label text-ink-muted">{title}</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span aria-hidden="true" className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-error/60" />
              <span className="h-3 w-3 rounded-full bg-accent-echo/60" />
              <span className="h-3 w-3 rounded-full bg-success/60" />
            </span>
          </div>
        </div>

        <div
          className={
            bleed
              ? "flex flex-col"
              : "flex flex-col gap-4 px-3 pb-3 sm:px-5 sm:pb-5 lg:gap-5 lg:px-6 lg:pb-6"
          }
        >
          {children}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5 sm:px-6 lg:px-8">
          <span className="flex items-center gap-2">
            <kbd className="rounded bg-bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
              ESC
            </kbd>
            <Link href="/" className="font-mono text-label text-ink-faint hover:text-ink">
              {SITE_HOST}
            </Link>
          </span>
          <FooterClock />
        </div>
      </main>
    </div>
  );
}
