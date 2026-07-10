import Link from "next/link";
import MagneticButton from "@/components/ui/MagneticButton";

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
      <div className="relative h-2 w-full overflow-hidden">
        <div className="absolute -inset-x-4 top-1/2 h-3 -translate-y-1/2 -rotate-1 bg-accent/90" />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <div className="flex flex-col gap-8 border-b border-line pb-16 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 font-mono text-label uppercase tracking-[0.2em] text-ink-muted">
              {subtext}
            </p>
            <h2 className="font-display text-display-md uppercase leading-[0.95] text-ink">
              {headingLines.map((line, i) => (
                <span key={i}>
                  {line}
                  {i < headingLines.length - 1 && <br />}
                </span>
              ))}
            </h2>
          </div>
          <MagneticButton href="/contact" cursorLabel="view">
            Start an inquiry →
          </MagneticButton>
        </div>

        <div className="grid grid-cols-2 gap-10 pt-16 sm:grid-cols-4">
          <div>
            <p className="mb-4 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
              Sitemap
            </p>
            <ul className="flex flex-col gap-2">
              {sitemap.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-cursor="view"
                    className="font-body text-body-sm text-ink-muted transition-colors hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-4 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
              Elsewhere
            </p>
            <ul className="flex flex-col gap-2">
              {socials.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="view"
                    className="font-body text-body-sm text-ink-muted transition-colors hover:text-accent"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-4 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
              Contact
            </p>
            <a
              href={`mailto:${contactEmail}`}
              data-cursor="view"
              className="font-body text-body-sm text-ink-muted transition-colors hover:text-accent"
            >
              {contactEmail}
            </a>
          </div>
          <div className="col-span-2 flex items-end justify-end sm:col-span-1">
            <p className="font-mono text-label text-ink-faint">
              © {new Date().getFullYear()} MJFIRD
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
