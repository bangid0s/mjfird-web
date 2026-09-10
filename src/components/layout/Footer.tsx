import Link from "next/link";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/motion/Reveal";

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
  const headingLines = heading.split("\n");
  // The CTA band already links to /contact, so skip it in the sitemap column.
  const sitemap = links.filter((l) => l.href !== "/contact");

  return (
    <footer className="relative mt-auto border-t border-line bg-bg">
      <div className="container-page py-[var(--space-section)]">
        {/* CTA band */}
        <Reveal className="surface relative overflow-hidden bg-bg-raised px-6 py-12 sm:px-12 sm:py-16">
          {/* One soft accent wash, the only decorative colour in the footer. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent opacity-[0.09] blur-3xl"
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow eyebrow-accent mb-5">{subtext}</p>
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
              <a
                href={`mailto:${contactEmail}`}
                data-cursor="view"
                className="text-body-sm text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent hover:decoration-accent"
              >
                {contactEmail}
              </a>
            </div>
          </div>
        </Reveal>

        {/* Columns */}
        <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
          <div>
            <p className="eyebrow mb-4">Sitemap</p>
            <ul className="flex flex-col gap-2.5">
              {sitemap.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-cursor="view"
                    className="text-body-sm text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-4">Elsewhere</p>
            <ul className="flex flex-col gap-2.5">
              {socials.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="view"
                    className="group inline-flex items-center gap-1.5 text-body-sm text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-accent"
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className="text-ink-faint transition-transform duration-[var(--duration-fast)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                    >
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-4">Contact</p>
            <a
              href={`mailto:${contactEmail}`}
              data-cursor="view"
              className="text-body-sm text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-accent"
            >
              {contactEmail}
            </a>
          </div>

          <div className="col-span-2 flex items-end sm:col-span-1 sm:justify-end">
            <p className="mono-meta">© {new Date().getFullYear()} MJFIRD</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
