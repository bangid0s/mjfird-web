import type { Metadata } from "next";
import Link from "next/link";
import { getProfile } from "@/lib/data/profile";
import {
  getResumeEntries,
  getResumeTools,
  type ResumeEntry,
  type ResumeTool,
} from "@/lib/data/resume";
import { getGalleryItems } from "@/lib/data/gallery";
import { getSiteSettings } from "@/lib/data/site-settings";
import Analytics from "@/components/analytics/Analytics";
import Avatar from "@/components/ui/Avatar";
import StandaloneWindow from "@/components/standalone/StandaloneWindow";
import PrintButton from "@/components/resume/PrintButton";

export const metadata: Metadata = {
  title: "Resume",
  description: "Experience, education and what I work with.",
};

// Every band pads to the same rhythm, so the colour blocks line up down the page.
const BAND = "px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-16 print:px-0 print:py-6";

const BUTTON_PRIMARY =
  "inline-flex items-center gap-2 bg-accent px-6 py-3.5 font-body text-body-sm font-medium text-accent-ink transition-[filter,transform] duration-[var(--duration-fast)] hover:brightness-110 active:translate-y-px";
const BUTTON_OUTLINE =
  "group inline-flex items-center gap-2 border border-line-strong px-6 py-3.5 font-body text-body-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:border-accent hover:text-accent-strong";

/** Earliest four-digit year in any experience period → "8+ years". */
function yearsOfExperience(entries: ResumeEntry[]) {
  const years = entries
    .flatMap((entry) => entry.period.match(/\b(19|20)\d{2}\b/g) ?? [])
    .map(Number);
  if (years.length === 0) return null;
  const span = new Date().getFullYear() - Math.min(...years);
  return span > 0 ? `${span}+ years` : null;
}

function SectionHeading({
  children,
  tone = "ink",
}: {
  children: React.ReactNode;
  tone?: "ink" | "accent" | "on-accent";
}) {
  return (
    <h2
      className={`display-sm ${
        tone === "accent" ? "text-accent-strong" : tone === "on-accent" ? "text-accent-ink" : "text-ink"
      }`}
    >
      {children}
    </h2>
  );
}

/**
 * An outline download button for the portfolio files in the hero — the same
 * shape as the gallery link beside it, with the arrow pointing down instead.
 */
function PortfolioDownload({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={BUTTON_OUTLINE}
    >
      {label}
      <span
        aria-hidden="true"
        className="inline-block transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-y-1"
      >
        ↓
      </span>
    </a>
  );
}

/**
 * A timeline row: a diamond marker on a hairline rail, the period held out to
 * the left on desktop, the detail to the right.
 */
function Entry({ entry, onAccent = false }: { entry: ResumeEntry; onAccent?: boolean }) {
  const muted = onAccent ? "text-accent-ink/75" : "text-ink-muted";
  const faint = onAccent ? "text-accent-ink/60" : "text-ink-faint";

  return (
    <li className="relative grid gap-1 pb-7 pl-7 last:pb-0 break-inside-avoid sm:grid-cols-[9rem_1fr] sm:gap-5">
      {/* Rail + marker. The rail stops at the last row rather than running on. */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-[5px] top-3 w-px ${
          onAccent ? "bg-accent-ink/25" : "bg-line"
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1.5 h-2.5 w-2.5 rotate-45 ${
          onAccent ? "bg-accent-ink" : "bg-accent"
        }`}
      />

      <div className="flex flex-col gap-0.5 sm:col-start-1">
        {entry.period && (
          <span
            className={`font-mono text-label uppercase tracking-[0.1em] ${
              onAccent ? "text-accent-ink" : "text-accent-strong"
            }`}
          >
            {entry.period}
          </span>
        )}
        {entry.location && (
          <span className={`font-mono text-[10px] uppercase tracking-[0.15em] ${faint}`}>
            {entry.location}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 sm:col-start-2">
        <h3
          className={`font-body text-body font-semibold ${
            onAccent ? "text-accent-ink" : "text-ink"
          }`}
        >
          {entry.role}
        </h3>
        {entry.organization && (
          <p className={`font-body text-body-sm font-medium ${muted}`}>{entry.organization}</p>
        )}
        {entry.summary && <p className={`font-body text-body-sm ${muted}`}>{entry.summary}</p>}
        {entry.bullets.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1.5">
            {entry.bullets.map((bullet, i) => (
              <li
                key={i}
                className={`relative pl-4 font-body text-body-sm before:absolute before:left-0 before:top-2.5 before:h-1 before:w-1 before:rotate-45 ${muted} ${
                  onAccent ? "before:bg-accent-ink/50" : "before:bg-accent"
                }`}
              >
                {bullet}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function ToolTile({ tool }: { tool: ResumeTool }) {
  return (
    <li className="group flex flex-col items-center gap-2 text-center" title={tool.note || tool.name}>
      <span className="flex h-14 w-14 items-center justify-center bg-bg-raised ring-1 ring-line transition-[box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:-translate-y-0.5 group-hover:ring-accent">
        {tool.iconUrl ? (
          /* Vendor icons are arbitrary pasted addresses — no next/image host
             allowlist to satisfy here. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={tool.iconUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-8 w-8 object-contain"
          />
        ) : (
          <span aria-hidden="true" className="font-display text-xl font-semibold tracking-[-0.03em] text-accent-strong">
            {tool.name.slice(0, 2)}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-body text-label text-ink">{tool.name}</span>
        {tool.note && <span className="truncate font-body text-[10px] text-ink-faint">{tool.note}</span>}
      </span>
    </li>
  );
}

export default async function ResumePage() {
  const [profile, entries, tools, gallery, settings] = await Promise.all([
    getProfile(),
    getResumeEntries(),
    getResumeTools(),
    getGalleryItems(),
    getSiteSettings(),
  ]);

  const name = settings.resumeHeadline || profile.name;
  const summary = settings.resumeSummary || profile.bio;
  const email = settings.resumeEmail || settings.contactEmail;
  // A resume-specific portrait when one is set, otherwise the site avatar.
  const photo = settings.resumePhotoUrl || profile.avatarUrl;

  const experience = entries.filter((entry) => entry.kind === "experience");
  const education = entries.filter((entry) => entry.kind === "education");
  const awards = entries.filter((entry) => entry.kind === "award");
  const experienceSpan = yearsOfExperience(experience);

  // A quick-read strip under the intro: the four things a client scans for
  // before deciding whether to read the rest.
  const glance = [
    experienceSpan && { label: "Experience", value: experienceSpan },
    settings.resumeLocation && { label: "Based in", value: settings.resumeLocation },
    profile.availabilityStatus && { label: "Availability", value: profile.availabilityStatus },
    settings.resumeLanguages.length > 0 && {
      label: "Languages",
      value: settings.resumeLanguages.map((l) => l.name).join(", "),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <StandaloneWindow title="// Resume" width="wide" bleed>
        {/* ---------- Hero: name and intro left, portrait stack right ---------- */}
        <section className={`grid gap-10 ${BAND} lg:grid-cols-[1.05fr_0.95fr] lg:gap-14`}>
          <div className="flex flex-col justify-center gap-5">
            <h1 className="display-lg">
              Hello,
              <br />
              I&rsquo;m {name}
            </h1>

            {settings.resumeRole && (
              <p className="font-body text-body-lg font-medium text-accent-strong">{settings.resumeRole}</p>
            )}

            {summary && (
              <p className="max-w-prose font-body text-body text-ink-muted">{summary}</p>
            )}

            <p className="hidden text-body-sm text-ink print:block">
              {[settings.resumeLocation, email, ...profile.socials.map((social) => social.url)].filter(Boolean).join("  ·  ")}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-3 print:hidden">
              {email && (
                <a href={`mailto:${email}?subject=${encodeURIComponent("Project inquiry")}`} className={BUTTON_PRIMARY}>
                  Work with me
                  <span aria-hidden="true">→</span>
                </a>
              )}
              {settings.resumePdfUrl ? (
                <a href={settings.resumePdfUrl} target="_blank" rel="noopener noreferrer" className={BUTTON_OUTLINE}>
                  Download CV
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-y-0.5"
                  >
                    ↓
                  </span>
                </a>
              ) : (
                <PrintButton className={BUTTON_OUTLINE}>
                  Save as PDF
                  <span aria-hidden="true">↓</span>
                </PrintButton>
              )}
              {/* Each portfolio download stands on its own link — set one and
                  only that button appears. */}
              {settings.resumeGraphicPortfolioUrl && (
                <PortfolioDownload
                  href={settings.resumeGraphicPortfolioUrl}
                  label={settings.resumeGraphicPortfolioLabel}
                />
              )}
              {settings.resumeIllustrationPortfolioUrl && (
                <PortfolioDownload
                  href={settings.resumeIllustrationPortfolioUrl}
                  label={settings.resumeIllustrationPortfolioLabel}
                />
              )}

              {/* Only offered once the gallery has something in it. */}
              {gallery.length > 0 && (
                <Link href="/gallery" className={BUTTON_OUTLINE}>
                  View gallery
                  <span
                    aria-hidden="true"
                    className="inline-block transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              )}
            </div>

            {glance.length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
                {glance.map((item) => (
                  <div key={item.label} className="flex flex-col gap-1 bg-bg-raised px-4 py-3.5">
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">{item.label}</dt>
                    <dd className="text-body-sm font-medium leading-snug text-ink">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className={`relative flex flex-col print:hidden ${photo ? "justify-end" : "justify-start lg:pt-4"}`}>
            {photo && (
              <div className="relative ml-auto w-full max-w-[20rem]">
                {/* Offset plate behind the portrait — the layered-block move
                    from the reference, in the site's own palette. */}
                <span
                  aria-hidden="true"
                  className="absolute -left-4 -top-4 hidden h-full w-full bg-accent sm:block"
                />
                <Avatar
                  src={photo}
                  alt={profile.name}
                  fit="cover"
                  sizes="(min-width: 640px) 20rem, 100vw"
                  className="relative aspect-[4/5] w-full"
                />

                {/* Floating badges, as in the reference. Both are real fields,
                    so neither renders on a profile that hasn't set them. */}
                {profile.availabilityStatus && (
                  <span className="absolute -left-2 top-6 bg-ink px-3.5 py-2 font-mono text-label uppercase tracking-[0.1em] text-bg shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)] sm:-left-5">
                    {profile.availabilityStatus}
                  </span>
                )}
                {settings.resumeLanguages[0] && (
                  <span className="absolute -right-2 top-1/3 bg-ink px-3.5 py-2 font-mono text-label uppercase tracking-[0.1em] text-bg shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)] sm:-right-5">
                    {settings.resumeLanguages[0].name}
                  </span>
                )}
              </div>
            )}

            {/* Contact card — offset left under the right-aligned portrait, so
                the two overlap into one stack rather than sitting in a column. */}
            <div
              className={`relative bg-bg-raised-2 p-5 ring-1 ring-line lg:p-6 print:bg-transparent print:p-0 print:ring-0 ${
                photo ? "-mt-8 mr-auto w-full max-w-[24rem] sm:-mt-14" : ""
              }`}
            >
              <h2 className="display-sm">
                Contact
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {settings.resumeLocation && (
                  <li className="font-body text-body-sm text-ink-muted">
                    {settings.resumeLocation}
                  </li>
                )}
                {email && (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="font-mono text-body-sm text-accent-strong underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
                    >
                      {email}
                    </a>
                  </li>
                )}
                {profile.socials.length > 0 && (
                  <li className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {profile.socials.map((social) => (
                      <a
                        key={social.url}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-accent"
                      >
                        {social.label} ↗
                      </a>
                    ))}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- Experience first: it is what a client reads for. The block
            overlaps into the band below so the two read as one stack. ---------- */}
        {experience.length > 0 && (
          <section className="relative z-10 mx-5 -mb-8 bg-accent px-5 py-8 text-accent-ink sm:mx-8 sm:px-8 sm:py-10 lg:mx-12 lg:-mb-16 lg:px-10 lg:py-12 print-plain print:mx-0 print:mb-0 print:px-0 print:py-6">
            <SectionHeading tone="on-accent">Experience</SectionHeading>
            <ul className="mt-6 flex flex-col">
              {experience.map((entry, i) => (
                <Entry key={`${entry.role}-${i}`} entry={entry} onAccent />
              ))}
            </ul>
          </section>
        )}

        {/* ---------- Band: education left, toolkit right, watermark behind ---------- */}
        {(education.length > 0 || tools.length > 0 || settings.resumeSkills.length > 0) && (
          <section className={`relative overflow-hidden bg-bg-raised-2 ${BAND} pt-20 sm:pt-24 lg:pt-32 print:bg-transparent print:pt-6`}>
            {/* Outlined display type, the reference's background word, cut in
                the site's stencil face. Stroke only and low contrast, so it
                stays a texture behind the grid rather than competing with it. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -right-6 select-none print:hidden font-display text-[clamp(5rem,13vw,11rem)] font-semibold uppercase leading-[0.78] tracking-[-0.05em] text-transparent opacity-[0.06] [-webkit-text-stroke:1px_var(--color-accent)]"
            >
              Resume
              <br />
              Resume
            </span>

            <div className="relative grid gap-12 lg:grid-cols-2 lg:gap-16">
              {education.length > 0 && (
                <div>
                  <SectionHeading tone="accent">Education</SectionHeading>
                  <ul className="mt-6 flex flex-col">
                    {education.map((entry, i) => (
                      <Entry key={`${entry.role}-${i}`} entry={entry} />
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-8">
                {tools.length > 0 && (
                  <div>
                    <SectionHeading tone="accent">Tools &amp; software</SectionHeading>
                    <ul className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4">
                      {tools.map((tool) => (
                        <ToolTile key={tool.name} tool={tool} />
                      ))}
                    </ul>
                  </div>
                )}

                {settings.resumeSkills.length > 0 && (
                  <div>
                    <h3 className="font-mono text-label uppercase tracking-[0.2em] text-ink-muted">
                      Skills
                    </h3>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {settings.resumeSkills.map((skill) => (
                        <li
                          key={skill}
                          className="border border-line-strong bg-bg/40 px-3.5 py-1.5 font-body text-body-sm text-ink"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ---------- Awards left, languages right ---------- */}
        {(awards.length > 0 || settings.resumeLanguages.length > 0) && (
          <section className={`grid gap-12 ${BAND} lg:grid-cols-2 lg:gap-16`}>
            {awards.length > 0 && (
              <div>
                <SectionHeading>Awards &amp; recognition</SectionHeading>
                <ul className="mt-6 flex flex-col">
                  {awards.map((entry, i) => (
                    <Entry key={`${entry.role}-${i}`} entry={entry} />
                  ))}
                </ul>
              </div>
            )}

            {settings.resumeLanguages.length > 0 && (
              <div>
                <SectionHeading>Languages</SectionHeading>
                <ul className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
                  {settings.resumeLanguages.map((language) => (
                    <li key={language.name} className="border-t border-line pt-3">
                      <span className="block font-display text-xl font-semibold tracking-[-0.03em] text-ink">
                        {language.name}
                      </span>
                      {language.level && (
                        <span className="mt-1 block font-body text-body-sm text-ink-muted">
                          {language.level}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </StandaloneWindow>

      <Analytics measurementId={settings.gaMeasurementId} />
    </>
  );
}
