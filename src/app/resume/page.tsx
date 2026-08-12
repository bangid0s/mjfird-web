import type { Metadata } from "next";
import { getProfile } from "@/lib/data/profile";
import { getResumeEntries, RESUME_KINDS, type ResumeEntry } from "@/lib/data/resume";
import { getSiteSettings } from "@/lib/data/site-settings";
import Analytics from "@/components/analytics/Analytics";
import Avatar from "@/components/ui/Avatar";
import StandaloneWindow from "@/components/standalone/StandaloneWindow";

export const metadata: Metadata = {
  title: "Resume",
  description: "Experience, education and what I work with.",
};

function Entry({ entry }: { entry: ResumeEntry }) {
  return (
    <li className="grid gap-1 border-t border-line py-5 first:border-t-0 first:pt-0 sm:grid-cols-[10rem_1fr] sm:gap-6">
      <div className="flex flex-col gap-0.5">
        {entry.period && (
          <span className="font-mono text-label uppercase tracking-[0.1em] text-accent">
            {entry.period}
          </span>
        )}
        {entry.location && (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            {entry.location}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="font-body text-body font-medium text-ink">{entry.role}</h3>
        {entry.organization && (
          <p className="font-body text-body-sm text-ink-muted">{entry.organization}</p>
        )}
        {entry.summary && (
          <p className="font-body text-body-sm text-ink-muted">{entry.summary}</p>
        )}
        {entry.bullets.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1.5">
            {entry.bullets.map((bullet, i) => (
              <li
                key={i}
                className="relative pl-4 font-body text-body-sm text-ink-muted before:absolute before:left-0 before:top-2.5 before:h-1 before:w-1 before:rounded-full before:bg-accent"
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

export default async function ResumePage() {
  const [profile, entries, settings] = await Promise.all([
    getProfile(),
    getResumeEntries(),
    getSiteSettings(),
  ]);

  const name = settings.resumeHeadline || profile.name;
  const summary = settings.resumeSummary || profile.bio;
  const email = settings.resumeEmail || settings.contactEmail;

  // Only render a section that has entries behind it, in the fixed order
  // experience → education → awards regardless of how rows were dragged.
  const sections = RESUME_KINDS.map((kind) => ({
    heading: kind.heading,
    entries: entries.filter((entry) => entry.kind === kind.value),
  })).filter((section) => section.entries.length > 0);

  return (
    <>
      <StandaloneWindow title="// Resume">
        <header className="flex flex-col gap-5 rounded-2xl bg-bg-raised p-5 sm:flex-row sm:gap-6 lg:p-6">
          {profile.avatarUrl && (
            <Avatar
              src={profile.avatarUrl}
              alt={profile.name}
              sizes="128px"
              className="h-24 w-24 shrink-0 rounded-xl border border-line sm:h-32 sm:w-32"
            />
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="font-display text-display-sm uppercase leading-[0.95] text-ink">
              {name}
            </h1>
            {settings.resumeRole && (
              <p className="font-body text-body-lg text-ink-muted">{settings.resumeRole}</p>
            )}
            {settings.resumeLocation && (
              <p className="font-mono text-label uppercase tracking-[0.15em] text-ink-faint">
                {settings.resumeLocation}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="font-mono text-label text-accent hover:underline"
                >
                  {email}
                </a>
              )}
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
            </div>

            {settings.resumePdfUrl && (
              <a
                href={settings.resumePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 self-start rounded-xl bg-accent px-6 py-3 font-body text-body-sm font-medium text-accent-ink transition-colors duration-[var(--duration-fast)] hover:bg-accent/85"
              >
                Download PDF
              </a>
            )}
          </div>
        </header>

        {summary && (
          <section className="rounded-2xl bg-bg-raised p-5 lg:p-6">
            <p className="font-body text-body text-ink-muted">{summary}</p>
          </section>
        )}

        {sections.map((section) => (
          <section key={section.heading} className="rounded-2xl bg-bg-raised p-5 lg:p-6">
            <h2 className="mb-4 font-mono text-label uppercase tracking-[0.25em] text-ink-faint">
              {section.heading}
            </h2>
            <ul className="flex flex-col">
              {section.entries.map((entry, i) => (
                <Entry key={`${entry.role}-${i}`} entry={entry} />
              ))}
            </ul>
          </section>
        ))}

        {settings.resumeSkills.length > 0 && (
          <section className="rounded-2xl bg-bg-raised p-5 lg:p-6">
            <h2 className="mb-4 font-mono text-label uppercase tracking-[0.25em] text-ink-faint">
              Skills
            </h2>
            <ul className="flex flex-wrap gap-2">
              {settings.resumeSkills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-lg bg-bg px-3 py-1.5 font-body text-body-sm text-ink-muted"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}
      </StandaloneWindow>

      <Analytics measurementId={settings.gaMeasurementId} />
    </>
  );
}
