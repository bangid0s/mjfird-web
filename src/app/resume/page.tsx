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
import SocialIcon from "@/components/ui/SocialIcon";
import StandaloneWindow from "@/components/standalone/StandaloneWindow";
import PrintButton from "@/components/standalone/PrintButton";

export const metadata: Metadata = {
  title: "Resume",
  description: "Experience, education and what I work with.",
};

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

const PRESENT = /present|now|current|sekarang|kini/i;

function isCurrent(period: string) {
  return PRESENT.test(period);
}

/** Every four-digit year in a free-text period ("2018 — 2021", "Mar 2021 – Present"). */
function yearsIn(period: string): number[] {
  return (period.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number);
}

/**
 * Whole years since the earliest experience entry started. Only ever derived
 * from what the admin typed — if no period has a year in it, there's no stat.
 */
function yearsOfPractice(entries: ResumeEntry[]): number | null {
  const starts = entries.flatMap((entry) => yearsIn(entry.period).slice(0, 1));
  if (starts.length === 0) return null;
  const years = new Date().getFullYear() - Math.min(...starts);
  return years > 0 ? years : null;
}

/** "2018 — 2021" → "3 yrs"; "2021 — Present" → years to now. */
function spanLabel(period: string): string | null {
  const years = yearsIn(period);
  if (years.length === 0) return null;
  const end = isCurrent(period) ? new Date().getFullYear() : (years[1] ?? years[0]);
  const span = end - years[0];
  if (span <= 0) return null;
  return `${span} yr${span === 1 ? "" : "s"}`;
}

/**
 * A five-step meter for the language levels people actually type. Anything
 * unrecognised gets no meter rather than a guessed one.
 */
function languageLevel(level: string): number | null {
  const l = level.toLowerCase();
  if (/native|mother|bilingual|asli|ibu/.test(l)) return 5;
  if (/fluent|c2|c1|proficient|lancar/.test(l)) return 4;
  if (/professional|advanced|b2|upper/.test(l)) return 4;
  if (/intermediate|conversational|b1|menengah/.test(l)) return 3;
  if (/elementary|basic|a2|a1|beginner|dasar/.test(l)) return 2;
  return null;
}

/* ------------------------------------------------------------------------ */
/* Pieces                                                                    */
/* ------------------------------------------------------------------------ */

function SectionHead({
  id,
  index,
  title,
  meta,
}: {
  id: string;
  index: number;
  title: string;
  meta?: string;
}) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-ink pb-3">
      <h2 id={`${id}-title`} className="flex items-baseline gap-3">
        <span className="font-mono text-label tabular-nums text-accent">
          {String(index).padStart(2, "0")}
        </span>
        <span className="display-sm">{title}</span>
      </h2>
      {meta && (
        <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-faint">
          {meta}
        </span>
      )}
    </header>
  );
}

/** A timeline row: period held out on the left, the detail on the right. */
function Entry({ entry }: { entry: ResumeEntry }) {
  const current = isCurrent(entry.period);
  const span = spanLabel(entry.period);

  return (
    <li className="grid gap-3 border-b border-line py-6 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-8 print:break-inside-avoid">
      <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-start">
        {entry.period && (
          <span className="font-mono text-label uppercase tracking-[0.1em] text-ink">
            {entry.period}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-1.5">
          {current && (
            <span className="inline-flex items-center gap-1.5 bg-accent px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-accent-ink">
              <span aria-hidden="true" className="h-1 w-1 bg-accent-ink" />
              Now
            </span>
          )}
          {span && (
            <span className="border border-line px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
              {span}
            </span>
          )}
        </span>
        {entry.location && (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            {entry.location}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="font-display text-lg font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-xl">
          {entry.role}
        </h3>
        {entry.organization && (
          <p className="font-body text-body-sm font-medium text-accent">{entry.organization}</p>
        )}
        {entry.summary && (
          <p className="max-w-prose font-body text-body-sm text-ink-muted text-pretty">
            {entry.summary}
          </p>
        )}
        {entry.bullets.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-2">
            {entry.bullets.map((bullet, i) => (
              <li
                key={i}
                className="relative max-w-prose pl-5 font-body text-body-sm text-ink-muted before:absolute before:left-0 before:top-[0.6em] before:h-px before:w-2.5 before:bg-accent"
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

function ToolCell({ tool }: { tool: ResumeTool }) {
  return (
    <li className="flex items-center gap-3 bg-bg-raised p-3 sm:p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-line bg-bg">
        {tool.iconUrl ? (
          /* Vendor icons are arbitrary pasted addresses — no next/image host
             allowlist to satisfy here. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={tool.iconUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-6 w-6 object-contain"
          />
        ) : (
          <span aria-hidden="true" className="font-mono text-label font-medium uppercase text-accent">
            {tool.name.slice(0, 2)}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-body text-body-sm font-medium text-ink">{tool.name}</span>
        {tool.note && (
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
            {tool.note}
          </span>
        )}
      </span>
    </li>
  );
}

function Meter({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`h-1 w-5 ${i < value ? "bg-accent" : "bg-line"}`} />
      ))}
    </span>
  );
}

function ButtonLink({
  href,
  children,
  primary = false,
  external = false,
  arrow = "→",
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
  external?: boolean;
  arrow?: "→" | "↓" | "↗";
}) {
  const classes = `group inline-flex h-11 items-center justify-center gap-3 px-5 font-mono text-label uppercase tracking-[0.15em] transition-colors duration-[var(--duration-fast)] ${
    primary
      ? "bg-accent text-accent-ink hover:bg-accent/85"
      : "border border-line-strong text-ink hover:border-ink"
  }`;
  const move =
    arrow === "↓"
      ? "group-hover:translate-y-0.5"
      : arrow === "↗"
        ? "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        : "group-hover:translate-x-1";
  const content = (
    <>
      {children}
      <span
        aria-hidden="true"
        className={`inline-block transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] ${move}`}
      >
        {arrow}
      </span>
    </>
  );

  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
      {content}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}

/* ------------------------------------------------------------------------ */
/* Page                                                                      */
/* ------------------------------------------------------------------------ */

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
  const practice = yearsOfPractice(experience);
  const hasToolkit = tools.length > 0 || settings.resumeSkills.length > 0;

  // Sections in reading order — numbered and indexed from one list, so the
  // sidebar index can never disagree with the page.
  const sections = [
    experience.length > 0 && { id: "experience", title: "Experience", meta: `${experience.length} ${experience.length === 1 ? "role" : "roles"}` },
    hasToolkit && { id: "toolkit", title: "Toolkit", meta: tools.length ? `${tools.length} tools` : undefined },
    education.length > 0 && { id: "education", title: "Education" },
    awards.length > 0 && { id: "awards", title: "Awards & recognition" },
    settings.resumeLanguages.length > 0 && { id: "languages", title: "Languages" },
  ].filter(Boolean) as { id: string; title: string; meta?: string }[];
  const indexOf = (id: string) => sections.findIndex((s) => s.id === id) + 1;

  // At-a-glance facts. Each cell is a real field or a figure derived from
  // one; none render on a resume that hasn't set them.
  const facts = [
    settings.resumeLocation && { label: "Based in", value: settings.resumeLocation },
    practice && { label: "In practice", value: `${practice}+ years` },
    experience[0]?.organization && { label: "Currently", value: experience[0].organization },
    settings.resumeLanguages.length > 0 && {
      label: "Speaks",
      value: settings.resumeLanguages.map((l) => l.name).join(", "),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <StandaloneWindow title="Resume" width="wide" bleed actions={<PrintButton />}>
        {/* ---------- Hero ---------- */}
        <section className="grid gap-8 px-5 pb-8 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1fr_auto] lg:gap-14 lg:px-12 lg:pb-12 lg:pt-16">
          <div className="flex min-w-0 flex-col gap-6">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 whitespace-nowrap font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
              <span aria-hidden="true" className="h-2 w-2 bg-accent" />
              <span>Curriculum vitae</span>
              {profile.availabilityStatus && (
                <>
                  <span aria-hidden="true" className="text-line-strong">
                    /
                  </span>
                  <span className="text-success">{profile.availabilityStatus}</span>
                </>
              )}
            </p>

            <h1 className="display-xl max-w-[14ch]">{name}</h1>

            {settings.resumeRole && (
              <p className="font-display text-display-sm font-medium tracking-[-0.02em] text-accent">
                {settings.resumeRole}
              </p>
            )}

            {summary && (
              <p className="max-w-[60ch] font-body text-body-lg text-ink-muted text-pretty">
                {summary}
              </p>
            )}

            <div className="flex flex-wrap gap-2 print:hidden">
              {settings.resumePdfUrl && (
                <ButtonLink href={settings.resumePdfUrl} primary external arrow="↓">
                  Download CV
                </ButtonLink>
              )}
              {/* Each portfolio download stands on its own link — set one and
                  only that button appears. */}
              {settings.resumeGraphicPortfolioUrl && (
                <ButtonLink href={settings.resumeGraphicPortfolioUrl} external arrow="↓">
                  {settings.resumeGraphicPortfolioLabel}
                </ButtonLink>
              )}
              {settings.resumeIllustrationPortfolioUrl && (
                <ButtonLink href={settings.resumeIllustrationPortfolioUrl} external arrow="↓">
                  {settings.resumeIllustrationPortfolioLabel}
                </ButtonLink>
              )}
              {/* Only offered once the gallery has something in it. */}
              {gallery.length > 0 && <ButtonLink href="/gallery">View gallery</ButtonLink>}
              {!settings.resumePdfUrl && (
                <ButtonLink href="/contact" primary>
                  Start a project
                </ButtonLink>
              )}
            </div>
          </div>

          {photo && (
            <figure className="relative w-full max-w-[17rem] self-end sm:max-w-[19rem] lg:w-[19rem]">
              <Avatar
                src={photo}
                alt={profile.name}
                fit="cover"
                sizes="(min-width: 640px) 19rem, 80vw"
                className="aspect-[4/5] w-full border border-line"
              />
              {/* Registration ticks on the corners — the spec-sheet frame. */}
              <span aria-hidden="true" className="absolute -left-2 -top-2 h-4 w-4 border-l border-t border-ink" />
              <span aria-hidden="true" className="absolute -bottom-2 -right-2 h-4 w-4 border-b border-r border-ink" />
              <figcaption className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                <span>{profile.name}</span>
                <span>Fig. 01</span>
              </figcaption>
            </figure>
          )}
        </section>

        {/* ---------- Fact strip ---------- */}
        {facts.length > 0 && (
          <dl
            className={`grid grid-cols-2 gap-px border-y border-line bg-line ${
              facts.length >= 4 ? "lg:grid-cols-4" : facts.length === 3 ? "lg:grid-cols-3" : ""
            }`}
          >
            {facts.map((fact) => (
              <div key={fact.label} className="flex min-w-0 flex-col gap-1 bg-bg-raised px-5 py-4 sm:px-8 lg:px-12 lg:py-5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  {fact.label}
                </dt>
                <dd className="line-clamp-2 font-body text-body-sm font-medium text-ink sm:text-body">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* ---------- Body: sticky index + sections ---------- */}
        <div className="grid gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[13rem_1fr] lg:gap-14 lg:px-12 lg:py-14">
          <aside className="flex flex-col gap-8 lg:sticky lg:top-8 lg:self-start print:hidden">
            {sections.length > 1 && (
              <nav aria-label="Resume sections" className="hidden lg:block">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  Index
                </p>
                <ol className="flex flex-col border-l border-line">
                  {sections.map((section, i) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="group -ml-px flex items-baseline gap-3 border-l border-transparent py-1.5 pl-4 font-body text-body-sm text-ink-muted transition-colors duration-[var(--duration-fast)] hover:border-accent hover:text-ink"
                      >
                        <span className="font-mono text-[10px] tabular-nums text-ink-faint group-hover:text-accent">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Contact block */}
            <div className="flex flex-col gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                Contact
              </p>
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="group flex items-center gap-2 break-all font-mono text-body-sm text-ink transition-colors duration-[var(--duration-fast)] hover:text-accent"
                >
                  <SocialIcon url="mailto:" className="h-4 w-4 shrink-0 text-ink-faint group-hover:text-accent" />
                  {email}
                </a>
              )}
              {profile.socials.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {profile.socials.map((social) => (
                    <li key={social.url}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 font-body text-body-sm text-ink-muted transition-colors duration-[var(--duration-fast)] hover:text-ink"
                      >
                        <SocialIcon
                          url={social.url}
                          label={social.label}
                          className="h-4 w-4 shrink-0 text-ink-faint group-hover:text-accent"
                        />
                        {social.label}
                        <span aria-hidden="true" className="text-ink-faint">
                          ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-14 lg:gap-16">
            {experience.length > 0 && (
              <section id="experience" aria-labelledby="experience-title" className="scroll-mt-8">
                <SectionHead id="experience" index={indexOf("experience")} title="Experience" meta={sections[indexOf("experience") - 1]?.meta} />
                <ol>
                  {experience.map((entry, i) => (
                    <Entry key={`${entry.role}-${i}`} entry={entry} />
                  ))}
                </ol>
              </section>
            )}

            {hasToolkit && (
              <section id="toolkit" aria-labelledby="toolkit-title" className="scroll-mt-8">
                <SectionHead id="toolkit" index={indexOf("toolkit")} title="Toolkit" meta={sections[indexOf("toolkit") - 1]?.meta} />
                {tools.length > 0 && (
                  <ul className="mt-6 grid grid-cols-1 gap-px border border-line bg-line min-[420px]:grid-cols-2 xl:grid-cols-3">
                    {tools.map((tool) => (
                      <ToolCell key={tool.name} tool={tool} />
                    ))}
                    {/* Pad the last row so the hairline grid closes square
                        instead of leaving a grey hole. */}
                    {Array.from({ length: (3 - (tools.length % 3)) % 3 }).map((_, i) => (
                      <li key={`pad-${i}`} aria-hidden="true" className="hidden bg-bg-raised xl:block" />
                    ))}
                    {tools.length % 2 === 1 && (
                      <li aria-hidden="true" className="hidden bg-bg-raised min-[420px]:block xl:hidden" />
                    )}
                  </ul>
                )}

                {settings.resumeSkills.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                      Skills
                    </h3>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {settings.resumeSkills.map((skill) => (
                        <li
                          key={skill}
                          className="border border-line-strong px-3 py-1.5 font-body text-body-sm text-ink"
                        >
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {education.length > 0 && (
              <section id="education" aria-labelledby="education-title" className="scroll-mt-8">
                <SectionHead id="education" index={indexOf("education")} title="Education" />
                <ol>
                  {education.map((entry, i) => (
                    <Entry key={`${entry.role}-${i}`} entry={entry} />
                  ))}
                </ol>
              </section>
            )}

            {awards.length > 0 && (
              <section id="awards" aria-labelledby="awards-title" className="scroll-mt-8">
                <SectionHead id="awards" index={indexOf("awards")} title="Awards & recognition" />
                <ol>
                  {awards.map((entry, i) => (
                    <Entry key={`${entry.role}-${i}`} entry={entry} />
                  ))}
                </ol>
              </section>
            )}

            {settings.resumeLanguages.length > 0 && (
              <section id="languages" aria-labelledby="languages-title" className="scroll-mt-8">
                <SectionHead id="languages" index={indexOf("languages")} title="Languages" />
                <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2">
                  {settings.resumeLanguages.map((language) => {
                    const level = languageLevel(language.level);
                    return (
                      <li key={language.name} className="flex items-center justify-between gap-4 bg-bg-raised px-4 py-4">
                        <span className="flex flex-col">
                          <span className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
                            {language.name}
                          </span>
                          {language.level && (
                            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                              {language.level}
                            </span>
                          )}
                        </span>
                        {level && <Meter value={level} />}
                      </li>
                    );
                  })}
                  {settings.resumeLanguages.length % 2 === 1 && (
                    <li aria-hidden="true" className="hidden bg-bg-raised sm:block" />
                  )}
                </ul>
              </section>
            )}
          </div>
        </div>

        {/* ---------- Closing call to action ---------- */}
        <section className="flex flex-col gap-6 border-t border-line bg-ink px-5 py-10 text-bg sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-14 print:hidden">
          <div className="flex flex-col gap-3">
            <p className="font-mono text-label uppercase tracking-[0.2em] text-bg/60">
              Next step
            </p>
            <p className="max-w-[18ch] font-display text-display-md font-semibold leading-[1] tracking-[-0.035em] text-bg">
              Let&rsquo;s make something together.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/contact"
              className="group inline-flex h-11 items-center gap-3 bg-accent px-5 font-mono text-label uppercase tracking-[0.15em] text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85"
            >
              Start a project
              <span aria-hidden="true" className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1">
                →
              </span>
            </Link>
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex h-11 items-center border border-bg/30 px-5 font-mono text-label uppercase tracking-[0.15em] text-bg transition-colors duration-[var(--duration-fast)] hover:border-bg"
              >
                Email me
              </a>
            )}
          </div>
        </section>
      </StandaloneWindow>

      <Analytics measurementId={settings.gaMeasurementId} />
    </>
  );
}
