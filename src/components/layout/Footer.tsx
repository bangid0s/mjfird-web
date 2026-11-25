"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/motion/Reveal";
import StudioTime from "@/components/layout/StudioTime";
import BackToTop from "@/components/layout/BackToTop";
import SocialIcon from "@/components/ui/SocialIcon";

export default function Footer({
  socials,
  heading,
  subtext,
  links,
}: {
  socials: { label: string; url: string }[];
  heading: string;
  subtext: string;
  links: { label: string; href: string }[];
}) {
  const pathname = usePathname();
  // The big "Start an inquiry" band only belongs on the homepage, where visitors
  // are still browsing. Everywhere else it competed with the request buttons:
  // clients on a service page clicked it instead and landed in Inquiries, outside
  // the tracked request flow.
  const showCta = pathname === "/";
  // While ordering (service pages, request forms, account), the small contact
  // link points back to the commission menu instead of the contact form.
  const ordering = pathname.startsWith("/services/") || pathname.startsWith("/account");
  const headingLines = heading.split("\n");
  // The Contact column links to /contact, so skip it in the sitemap column.
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
  <p className="label">Replies within 2 working days</p>
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
            {/* Icons only, side by side; the label lives on aria-label and the tooltip. */}
            <ul className="-ml-2.5 flex flex-wrap items-center gap-1">
              {socials.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    data-cursor="view"
                    className="flex h-11 w-11 items-center justify-center text-ink-muted transition-[color,transform] duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:text-accent-strong"
                  >
                    <SocialIcon url={item.url} label={item.label} className="h-[22px] w-[22px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 flex flex-col gap-4">
            <p className="eyebrow text-ink-faint">Contact</p>
            <Link
              href={ordering ? "/services" : "/contact"}
              data-cursor="view"
              className="display-sm w-fit underline decoration-line-strong decoration-1 underline-offset-[6px] transition-colors duration-[var(--duration-fast)] hover:text-accent-strong hover:decoration-accent"
            >
              {ordering ? "Browse commissions →" : "Send an inquiry →"}
            </Link>
            <p className="max-w-sm text-body-sm text-ink-muted">
              {ordering
                ? "Every commission is requested from its service page, so it's tracked, messaged and paid in one place."
                : "Commissions, retainers and collaborations. Replies within 2 working days."}
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="mono-meta">© {new Date().getFullYear()} MJFIRD — All rights reserved</p>
          <StudioTime />
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
