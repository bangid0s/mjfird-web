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
import { getProjects } from "@/lib/data/projects";
import { getTestimonials } from "@/lib/data/testimonials";
import { getSiteSettings } from "@/lib/data/site-settings";
import {
  calmCaps,
  currentEntry,
  isCurrentPeriod,
  languageLevel,
  sortNewestFirst,
  spanLabel,
  splitEducation,
  splitRecent,
  yearsOfPractice,
} from "@/lib/resume";
import { formatStat } from "@/lib/stats";
import { SITE_HOST } from "@/lib/site-url";
import type { Project } from "@/lib/placeholder-data";
import Analytics from "@/components/analytics/Analytics";
import Avatar from "@/components/ui/Avatar";
import SocialIcon from "@/components/ui/SocialIcon";
import SmartImage from "@/components/media/SmartImage";
import StandaloneWindow from "@/components/standalone/StandaloneWindow";
import PrintButton from "@/components/standalone/PrintButton";
import { ReviewBody } from "@/components/reviews/ReviewCard";
import EarlierEntries from "@/components/resume/EarlierEntries";
import ToolIcon from "@/components/resume/ToolIcon";

export const metadata: Metadata = {
  title: "Resume",
  description: "Experience, selected work, references and what I work with.",
};

/* ------------------------------------------------------------------------ */
/* Pieces                                                                    */
/* ------------------------------------------------------------------------ */

function SectionHead({ id, title, meta }: { id: string; title: string; meta?: string }) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-ink pb-3 print:pb-1.5">
      <h2 id={`${id}-title`} className="display-sm print:text-[13pt]">
        {title}
      </h2>
      {meta && <span className="text-body-sm text-ink-faint print:hidden">{meta}</span>}
    </header>
  );
}

/** A timeline row: period held out on the left, the detail on the right. */
function Entry({ entry, nowYear }: { entry: ResumeEntry; nowYear: number }) {
  const current = isCurrentPeriod(entry.period, nowYear);
  const span = spanLabel(entry.period, nowYear);

  return (
    <li className="grid gap-3 border-b border-line py-6 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-8 print:grid-cols-[7.5rem_1fr] print:gap-5 print:break-inside-avoid print:py-2.5">
      <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-start print:flex-col print:items-start print:gap-y-0.5">
        {entry.period && (
          <span className="font-mono text-label tabular-nums tracking-[0.06em] text-ink">
            {entry.period}
          </span>
        )}
        {(current || span) && (
          <span className="flex flex-wrap items-center gap-1.5">
            {current && (
              <span className="inline-flex items-center gap-1.5 bg-accent px-1.5 py-0.5 text-[0.6875rem] font-medium text-accent-ink print:border print:border-ink print:bg-transparent print:text-ink">
                Now
              </span>
            )}
            {span && <span className="text-label text-ink-faint">{span}</span>}
          </span>
        )}
        {entry.location && <span className="text-label text-ink-faint">{entry.location}</span>}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 print:gap-0.5">
        <h3 className="font-display text-lg font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-xl print:text-[11pt]">
          {calmCaps(entry.role)}
        </h3>
        {entry.organization && (
          <p className="text-body-sm font-medium text-accent-strong print:text-[9.5pt]">{entry.organization}</p>
        )}
        {entry.summary && (
          <p className="max-w-prose text-body-sm text-ink-muted text-pretty print:text-[9.5pt] print:leading-snug">
            {entry.summary}
          </p>
        )}
        {entry.bullets.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-2 print:mt-0.5 print:gap-0.5">
            {entry.bullets.map((bullet, i) => (
              <li
                key={i}
                className="relative max-w-prose pl-5 text-body-sm text-ink-muted before:absolute before:left-0 before:top-[0.6em] before:h-px before:w-2.5 before:bg-accent print:text-[9.5pt] print:leading-snug"
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

/** One line per older role: when, what, where. */
function CompactEntry({ entry }: { entry: ResumeEntry }) {
  return (
    <li className="grid gap-x-8 gap-y-0.5 py-2 sm:grid-cols-[10rem_1fr] print:grid-cols-[7.5rem_1fr] print:gap-x-5 print:py-1">
      <span className="font-mono text-label tabular-nums tracking-[0.06em] text-ink-faint">{entry.period}</span>
      <span className="min-w-0 text-body-sm text-ink print:text-[9.5pt]">
        {calmCaps(entry.role)}
        {entry.organization && <span className="text-ink-muted">, {entry.organization}</span>}
      </span>
    </li>
  );
}

/** A section's entries: the recent ones in full, the rest folded to lines. */
function EntryList({
  recent,
  earlier,
  earlierLabel,
  nowYear,
}: {
  recent: ResumeEntry[];
  earlier: ResumeEntry[];
  earlierLabel: string;
  nowYear: number;
}) {
  const hasDetail = earlier.some((entry) => entry.summary || entry.bullets.length > 0);
  return (
    <>
      <ol>
        {recent.map((entry, i) => (
          <Entry key={`${entry.role}-${i}`} entry={entry} nowYear={nowYear} />
        ))}
      </ol>
      {earlier.length > 0 && (
        <EarlierEntries
          label={earlierLabel}
          count={earlier.length}
          expandable={hasDetail}
          compact={
            <ol className="mt-2 print:mt-1">
              {earlier.map((entry, i) => (
                <CompactEntry key={`${entry.role}-${i}`} entry={entry} />
              ))}
            </ol>
          }
          full={
            <ol>
              {earlier.map((entry, i) => (
                <Entry key={`${entry.role}-${i}`} entry={entry} nowYear={nowYear} />
              ))}
            </ol>
          }
        />
      )}
    </>
  );
}

function ToolCell({ tool }: { tool: ResumeTool }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5 bg-bg-raised p-3 sm:gap-3 sm:p-4 print:gap-2 print:p-1.5">
      <ToolIcon src={tool.iconUrl} name={tool.name} />
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 text-body-sm font-medium leading-snug text-ink print:text-[9.5pt]">{tool.name}</span>
        {tool.note && <span className="truncate text-label text-ink-faint">{tool.note}</span>}
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

/** The work is the argument, so each piece gets a frame and one caption line. */
function WorkTile({ project, priority }: { project: Project; priority: boolean }) {
  const hasCover = Boolean(project.cover) && !project.cover.startsWith("/placeholder");
  return (
    <li className="min-w-0">
      <Link href={`/work/${project.slug}`} className="group flex flex-col gap-2.5">
        <span className="relative block aspect-[4/5] w-full overflow-hidden border border-line bg-bg-raised-2 transition-colors duration-[var(--duration-fast)] group-hover:border-ink">
          {hasCover ? (
            <SmartImage
              src={project.cover}
              alt=""
              priority={priority}
              sizes="(min-width: 1024px) 17rem, 46vw"
              className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.03]"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-body-sm text-ink-faint">
              {project.category}
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body-sm font-medium text-ink">{project.title}</span>
          <span className="truncate text-label text-ink-faint">
            {[project.category, project.client].filter(Boolean).join(" for ")}
          </span>
        </span>
      </Link>
    </li>
  );
}

const quietLink =
  "inline-flex min-h-11 items-center gap-2 text-body-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:decoration-accent";

/* ------------------------------------------------------------------------ */
/* Page                                                                      */
/* ------------------------------------------------------------------------ */

export default async function ResumePage() {
  const [profile, entries, tools, gallery, projects, testimonials, settings] = await Promise.all([
    getProfile(),
    getResumeEntries(),
    getResumeTools(),
    getGalleryItems(),
    getProjects(),
    getTestimonials(),
    getSiteSettings(),
  ]);
  const nowYear = new Date().getFullYear();

  const name = settings.resumeHeadline || profile.name;
  const summary = settings.resumeSummary || profile.bio;
  const email = settings.resumeEmail || settings.contactEmail;
  // A resume-specific portrait when one is set, otherwise the site avatar.
  const photo = settings.resumePhotoUrl || profile.avatarUrl;

  // Whatever order the rows were typed in, a resume reads newest first.
  const byKind = (kind: ResumeEntry["kind"]) =>
    sortNewestFirst(entries.filter((entry) => entry.kind === kind), nowYear);
  const experience = byKind("experience");
  const education = byKind("education");
  const awards = byKind("award");
  const experienceSplit = splitRecent(experience, nowYear);
  const educationSplit = splitEducation(education);

  const hasToolkit = tools.length > 0 || settings.resumeSkills.length > 0;
  const work = (projects.some((p) => p.featured) ? projects.filter((p) => p.featured) : projects).slice(0, 4);
  const references = testimonials.slice(0, 2);
  const stats = settings.stats.slice(0, 4);

  // Sections in reading order: the page and the sidebar index read one list,
  // so they can't disagree.
  const sections = [
    experience.length > 0 && {
      id: "experience",
      title: "Experience",
      meta: `${experience.length} ${experience.length === 1 ? "role" : "roles"}`,
    },
    references.length > 0 && { id: "references", title: "References" },
    hasToolkit && { id: "toolkit", title: "Toolkit" },
    education.length > 0 && { id: "education", title: "Education" },
    awards.length > 0 && { id: "awards", title: "Awards and recognition" },
    settings.resumeLanguages.length > 0 && { id: "languages", title: "Languages" },
  ].filter(Boolean) as { id: string; title: string; meta?: string }[];
  const metaOf = (id: string) => sections.find((s) => s.id === id)?.meta;

  // At-a-glance facts. Each cell is a real field or a figure derived from
  // one; none render on a resume that hasn't set them.
  const now = currentEntry(experience, nowYear);
  const latest = now ?? experience[0];
  const practice = yearsOfPractice(experience, nowYear);
  const facts = [
    settings.resumeLocation && { label: "Based in", value: settings.resumeLocation },
    // The site's own stats already carry a years figure; a second, derived
    // one beside them would only ever disagree with it.
    stats.length === 0 && practice && { label: "In practice", value: `${practice}+ years` },
    settings.resumeLanguages.length > 0 && {
      label: "Speaks",
      value: settings.resumeLanguages.map((l) => l.name).join(", "),
    },
    // Last, so on a phone the longest value gets the full-width cell.
    latest && {
      label: now ? "Currently" : "Most recently",
      value: [calmCaps(latest.role), latest.organization].filter(Boolean).join(", "),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  const downloads = [
    settings.resumeGraphicPortfolioUrl && {
      label: settings.resumeGraphicPortfolioLabel,
      href: settings.resumeGraphicPortfolioUrl,
    },
    settings.resumeIllustrationPortfolioUrl && {
      label: settings.resumeIllustrationPortfolioLabel,
      href: settings.resumeIllustrationPortfolioUrl,
    },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <>
      <StandaloneWindow title="Resume" width="wide" bleed actions={<PrintButton label="Print / PDF" />}>
        {/* ---------- Hero ---------- */}
        <section className="grid gap-8 px-5 pb-8 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1fr_auto] lg:gap-14 lg:px-12 lg:pb-12 lg:pt-16 print:grid-cols-[1fr_auto] print:gap-6 print:px-0 print:pb-4 print:pt-0">
          <div className="flex min-w-0 flex-col gap-6 print:gap-2">
            {profile.availabilityStatus && (
              <p className="flex items-center gap-2 text-body-sm font-medium text-success print:hidden">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
                {profile.availabilityStatus}
              </p>
            )}

            <h1 className="display-xl max-w-[14ch] print:max-w-none print:text-[26pt] print:leading-none">{name}</h1>

            {settings.resumeRole && (
              <p className="font-display text-display-sm font-medium tracking-[-0.02em] text-accent-strong print:text-[12pt]">
                {settings.resumeRole}
              </p>
            )}

            {/* Paper has no links to press, so the contact line is spelled out. */}
            <p className="hidden text-[9.5pt] text-ink print:block">
              {[email, SITE_HOST, settings.resumeLocation].filter(Boolean).join("  |  ")}
            </p>

            {summary && (
              <p className="max-w-[60ch] text-body-lg text-ink-muted text-pretty print:max-w-none print:text-[10pt] print:leading-snug">
                {summary}
              </p>
            )}

            <div className="flex flex-col gap-3 print:hidden">
              <div className="flex flex-wrap gap-2">
                {settings.resumePdfUrl ? (
                  <a
                    href={settings.resumePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex h-12 flex-1 items-center justify-center gap-3 whitespace-nowrap bg-accent px-4 text-body-sm sm:px-6 font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85 sm:flex-none"
                  >
                    Download CV
                    <span aria-hidden="true" className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-y-0.5">
                      ↓
                    </span>
                  </a>
                ) : (
                  <Link
                    href="/services"
                    className="inline-flex h-12 flex-1 items-center justify-center whitespace-nowrap bg-accent px-4 text-body-sm sm:px-6 font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85 sm:flex-none"
                  >
                    Commission me
                  </Link>
                )}
                {settings.resumePdfUrl && (
                  <Link
                    href="/services"
                    className="inline-flex h-12 flex-1 items-center justify-center whitespace-nowrap border border-line-strong px-4 text-body-sm sm:px-6 font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:border-ink sm:flex-none"
                  >
                    Commission me
                  </Link>
                )}
              </div>

              {/* The other downloads are a step down from the CV, so they read
                  as links rather than three more buttons of the same weight. */}
              {(downloads.length > 0 || gallery.length > 0) && (
                <ul className="flex flex-wrap gap-x-6 gap-y-0">
                  {downloads.map((item) => (
                    <li key={item.href}>
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className={quietLink}>
                        {item.label}
                        <span aria-hidden="true" className="text-ink-faint">
                          ↓
                        </span>
                      </a>
                    </li>
                  ))}
                  {gallery.length > 0 && (
                    <li>
                      <Link href="/gallery" className={quietLink}>
                        Gallery
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {photo && (
            <figure className="relative order-first w-24 self-start sm:w-32 lg:order-none lg:w-[19rem] lg:self-end print:order-none print:w-[8.5rem] print:self-start">
              <Avatar
                src={photo}
                alt={profile.name}
                fit="cover"
                sizes="(min-width: 1024px) 19rem, 8rem"
                className="aspect-[4/5] w-full border border-line"
              />
              {/* Registration ticks on the corners, the spec-sheet frame. */}
              <span aria-hidden="true" className="absolute -left-2 -top-2 hidden h-4 w-4 border-l border-t border-ink lg:block print:hidden" />
              <span aria-hidden="true" className="absolute -bottom-2 -right-2 hidden h-4 w-4 border-b border-r border-ink lg:block print:hidden" />
            </figure>
          )}
        </section>

        {/* ---------- Fact strip ---------- */}
        {facts.length > 0 && (
          <dl
            className={`grid grid-cols-2 gap-px border-y border-line bg-line print:grid-cols-3 ${
              facts.length >= 4 ? "lg:grid-cols-4" : facts.length === 3 ? "lg:grid-cols-3" : ""
            }`}
          >
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="flex min-w-0 flex-col gap-1 bg-bg-raised px-5 py-4 last:odd:col-span-2 sm:px-8 lg:px-12 lg:py-5 lg:last:odd:col-span-1 print:bg-transparent print:px-0 print:py-2 print:last:odd:col-span-1"
              >
                <dt className="text-label text-ink-faint">{fact.label}</dt>
                <dd className="line-clamp-2 text-body-sm font-medium text-ink sm:text-body print:text-[9.5pt]">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* ---------- Selected work ---------- */}
        {work.length > 0 && (
          <section
            aria-labelledby="work-title"
            className="flex flex-col gap-6 border-b border-line px-5 py-10 sm:px-8 lg:px-12 lg:py-14 print:hidden"
          >
            <header className="flex items-end justify-between gap-4">
              <h2 id="work-title" className="display-sm">
                Selected work
              </h2>
              <Link href="/work" className={quietLink}>
                All {projects.length} projects
              </Link>
            </header>

            <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-5">
              {work.map((project, i) => (
                <WorkTile key={project.slug} project={project} priority={i < 2} />
              ))}
            </ul>

            {stats.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-0.5">
                    <dt className="order-1 text-body-sm text-ink-muted">{stat.label}</dt>
                    <dd className="font-display text-2xl font-semibold tabular-nums tracking-[-0.03em] text-ink">
                      {formatStat(stat)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        {/* ---------- Body: sticky index + sections ---------- */}
        <div className="grid gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[13rem_1fr] lg:gap-14 lg:px-12 lg:py-14 print:block print:px-0 print:py-4">
          <aside className="flex flex-col gap-8 border-b border-line pb-8 lg:sticky lg:top-8 lg:self-start lg:border-0 lg:pb-0 print:hidden">
            {sections.length > 1 && (
              <nav aria-label="Resume sections" className="hidden lg:block">
                <p className="mb-3 text-label text-ink-faint">On this page</p>
                <ol className="flex flex-col border-l border-line">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="-ml-px block border-l border-transparent py-1.5 pl-4 text-body-sm text-ink-muted transition-colors duration-[var(--duration-fast)] hover:border-accent hover:text-ink"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            <div className="flex flex-col gap-3">
              <p className="text-label text-ink-faint">Contact</p>
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="group flex min-h-11 items-center gap-2 break-all text-body-sm font-medium text-ink transition-colors duration-[var(--duration-fast)] hover:text-accent-strong lg:min-h-0"
                >
                  <SocialIcon url="mailto:" className="h-4 w-4 shrink-0 text-ink-faint group-hover:text-accent-strong" />
                  {email}
                </a>
              )}
              {profile.socials.length > 0 && (
                <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1.5">
                  {profile.socials.map((social) => (
                    <li key={social.url}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        className="group flex h-11 w-11 items-center justify-center gap-2 border border-line text-body-sm text-ink-muted transition-colors duration-[var(--duration-fast)] hover:border-ink hover:text-ink lg:h-auto lg:w-auto lg:justify-start lg:border-0"
                      >
                        <SocialIcon
                          url={social.url}
                          label={social.label}
                          className="h-4 w-4 shrink-0 text-ink-faint group-hover:text-accent-strong"
                        />
                        <span className="hidden lg:inline">{social.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-14 lg:gap-16 print:gap-5">
            {experience.length > 0 && (
              <section id="experience" aria-labelledby="experience-title" className="scroll-mt-8">
                <SectionHead id="experience" title="Experience" meta={metaOf("experience")} />
                <EntryList
                  recent={experienceSplit.recent}
                  earlier={experienceSplit.earlier}
                  earlierLabel="Earlier roles"
                  nowYear={nowYear}
                />
              </section>
            )}

            {references.length > 0 && (
              <section id="references" aria-labelledby="references-title" className="scroll-mt-8 print:break-inside-avoid">
                <SectionHead id="references" title="References" />
                <div className="grid gap-px border-b border-line bg-line sm:grid-cols-2 print:grid-cols-2">
                  {references.map((t, i) => (
                    <figure
                      key={t.id ?? t.name}
                      className={`${i > 0 ? "hidden sm:flex print:flex" : "flex"} flex-col justify-between gap-6 bg-bg-raised py-6 sm:odd:pr-8 sm:even:pl-8 print:gap-2 print:bg-transparent print:py-2.5 print:text-[9.5pt] print:leading-snug print:odd:pr-4 print:even:pl-4 print:[&_button]:hidden`}
                    >
                      <ReviewBody t={t} clamp />
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {hasToolkit && (
              <section id="toolkit" aria-labelledby="toolkit-title" className="scroll-mt-8 print:break-inside-avoid">
                <SectionHead id="toolkit" title="Toolkit" />
                {tools.length > 0 && (
                  <ul className="mt-6 grid grid-cols-2 gap-px border border-line bg-line xl:grid-cols-3 print:mt-2.5 print:grid-cols-3">
                    {tools.map((tool) => (
                      <ToolCell key={tool.name} tool={tool} />
                    ))}
                    {/* Pad the last row so the hairline grid closes square
                        instead of leaving a grey hole. */}
                    {tools.length % 2 === 1 && (
                      <li aria-hidden="true" className="bg-bg-raised xl:hidden print:hidden" />
                    )}
                    {Array.from({ length: (3 - (tools.length % 3)) % 3 }).map((_, i) => (
                      <li key={`pad-${i}`} aria-hidden="true" className="hidden bg-bg-raised xl:block print:block" />
                    ))}
                  </ul>
                )}

                {settings.resumeSkills.length > 0 && (
                  <div className="mt-8 print:mt-2.5">
                    <h3 className="text-label text-ink-faint">Skills</h3>
                    <ul className="mt-3 flex flex-wrap gap-2 print:mt-1 print:gap-x-0 print:gap-y-0">
                      {settings.resumeSkills.map((skill, i) => (
                        <li
                          key={skill}
                          className="border border-line-strong px-3 py-1.5 text-body-sm text-ink print:border-0 print:p-0 print:text-[9.5pt]"
                        >
                          {skill}
                          {i < settings.resumeSkills.length - 1 && (
                            <span aria-hidden="true" className="hidden print:inline">
                              ,&nbsp;
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {education.length > 0 && (
              <section id="education" aria-labelledby="education-title" className="scroll-mt-8 print:break-inside-avoid">
                <SectionHead id="education" title="Education" />
                <EntryList
                  recent={educationSplit.recent}
                  earlier={educationSplit.earlier}
                  earlierLabel="Earlier schooling"
                  nowYear={nowYear}
                />
              </section>
            )}

            {awards.length > 0 && (
              <section id="awards" aria-labelledby="awards-title" className="scroll-mt-8">
                <SectionHead id="awards" title="Awards and recognition" />
                <ol>
                  {awards.map((entry, i) => (
                    <Entry key={`${entry.role}-${i}`} entry={entry} nowYear={nowYear} />
                  ))}
                </ol>
              </section>
            )}

            {settings.resumeLanguages.length > 0 && (
              <section id="languages" aria-labelledby="languages-title" className="scroll-mt-8 print:break-inside-avoid">
                <SectionHead id="languages" title="Languages" />
                <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 print:mt-2.5 print:grid-cols-2">
                  {settings.resumeLanguages.map((language) => {
                    const level = languageLevel(language.level);
                    return (
                      <li
                        key={language.name}
                        className="flex items-center justify-between gap-4 bg-bg-raised px-4 py-4 print:px-2 print:py-1.5"
                      >
                        <span className="flex flex-col">
                          <span className="font-display text-lg font-semibold tracking-[-0.02em] text-ink print:text-[10pt]">
                            {language.name}
                          </span>
                          {language.level && <span className="text-label text-ink-faint">{language.level}</span>}
                        </span>
                        {level && (
                          <span className="print:hidden">
                            <Meter value={level} />
                          </span>
                        )}
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

        {/* ---------- Closing: the retainer offer, or a plain next step ---------- */}
        {settings.retainerEnabled ? (
          <section
            aria-labelledby="retainer-title"
            className="grid gap-8 border-t border-line bg-accent px-5 py-10 text-accent-ink sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:px-12 lg:py-14 print:hidden"
          >
            <div className="flex flex-col items-start gap-4">
              <p className="text-body-sm font-medium">{settings.retainerEyebrow}</p>
              <h2
                id="retainer-title"
                className="font-display text-display-md font-semibold leading-[1.02] tracking-[-0.035em]"
              >
                {settings.retainerTitle}
              </h2>
              <p className="max-w-[46ch] text-body-lg text-pretty">{settings.retainerIntro}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href="/contact?type=retainer"
                  className="inline-flex h-12 items-center justify-center bg-accent-ink px-6 text-body-sm font-medium text-accent transition-opacity duration-[var(--duration-fast)] hover:opacity-85"
                >
                  {settings.retainerCtaLabel}
                </Link>
                {settings.retainerPriceLabel && <span className="text-body-sm">{settings.retainerPriceLabel}</span>}
              </div>
            </div>
            {settings.retainerPoints.length > 0 && (
              <ul className="flex flex-col self-end border-t border-accent-ink/25">
                {settings.retainerPoints.map((point) => (
                  <li key={point} className="flex items-baseline gap-3 border-b border-accent-ink/25 py-3 text-body">
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 -translate-y-[0.15em] bg-current" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="flex flex-col gap-6 border-t border-line bg-ink px-5 py-10 text-bg sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-14 print:hidden">
            <p className="max-w-[18ch] font-display text-display-md font-semibold leading-[1] tracking-[-0.035em] text-bg">
              Have a project in mind?
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/services"
                className="inline-flex h-12 items-center bg-accent px-6 text-body-sm font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85"
              >
                Commission me
              </Link>
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex h-12 items-center border border-bg/30 px-6 text-body-sm font-medium text-bg transition-colors duration-[var(--duration-fast)] hover:border-bg"
                >
                  Email me
                </a>
              )}
            </div>
          </section>
        )}
      </StandaloneWindow>

      <Analytics measurementId={settings.gaMeasurementId} />
    </>
  );
}
