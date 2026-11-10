"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/motion/Reveal";
import StudioTime from "@/components/layout/StudioTime";
import BackToTop from "@/components/layout/BackToTop";

export default function Footer({
  socials,
  heading,
  subtext,
  contactEmail,
  links,
}: {
  socials: { label: string; url: string }[];
  heading: string;
  subtext: string;
  contactEmail: string;
  links: { label: string; href: string }[];
}) {
  const pathname = usePathname();
  // On /contact the form *is* the call to action; a second one under it is noise.
  const showCta = pathname !== "/contact";
  const headingLines = heading.split("\n");
  // The CTA band already links to /contact, so skip it in the sitemap column.
  // Privacy and Terms stay here even when the nav list in settings does not include them.
  const legalLinks = [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ];
  const sitemap = [
    ...links.filter((l) => l.href !== "/contact" && !legalLinks.some((item) => item.href === l.href)),
    ...legalLinks,
  ];

  return (
    <footer className="relative mt-auto border-t border-line bg-bg">
      <div className="container-page py-[var(--space-section)]">
        {/* CTA band */}
        {showCta && (
          <Reveal className="relative mb-20">
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow mb-6">{subtext}</p>
                <h2 className="display-lg max-w-2xl">
                  {headingLines.map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < headingLines.length - 1 && <br />}
                    </span>
                  ))}
                </h2>
              </div>

              <div className="flex shrink-0 flex-col items-start gap-4">
                <MagneticButton href="/contact" cursorLabel="view">
                  Start an inquiry
                </MagneticButton>
  <p className="label">Usually replies within 48 hours</p>
              </div>
            </div>
          </Reveal>
        )}

        {/* Columns */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 border-t border-line pt-10 sm:grid-cols-4">
          <div>
            <p className="eyebrow mb-4 text-ink-faint">Sitemap</p>
            <ul className="flex flex-col gap-2.5">
              {sitemap.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-cursor="view"
                    className="text-body-sm text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-4 text-ink-faint">Elsewhere</p>
            <ul className="flex flex-col gap-2.5">
              {socials.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="view"
                    className="group inline-flex items-center gap-1.5 text-body-sm text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-ink"
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className="text-ink-faint transition-transform duration-[var(--duration-fast)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    >
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 flex flex-col gap-4">
            <p className="eyebrow text-ink-faint">Contact</p>
            <a
              href={`mailto:${contactEmail}`}
              data-cursor="view"
              className="display-sm w-fit underline decoration-line-strong decoration-1 underline-offset-[6px] transition-colors duration-[var(--duration-fast)] hover:text-accent-strong hover:decoration-accent"
            >
              {contactEmail}
            </a>
            <p className="max-w-sm text-body-sm text-ink-muted">
              Commissions, retainers and collaborations. Replies within a couple of days.
            </p>
          </div>
        </div>

        {/* Signature: the wordmark at full width, cropped by the sheet's edge. */}
        <div aria-hidden="true" className="mt-16 select-none overflow-hidden">
          <p className="font-display font-semibold leading-[0.78] tracking-[-0.06em] text-ink text-[clamp(4.5rem,24vw,23rem)]">
            MJFIRD<span className="text-accent">.</span>
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="mono-meta">© {new Date().getFullYear()} MJFIRD — All rights reserved</p>
          <StudioTime />
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
