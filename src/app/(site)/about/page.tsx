import type { Metadata } from "next";
import Avatar from "@/components/ui/Avatar";
import SectionHeader from "@/components/ui/SectionHeader";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/motion/Reveal";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "About",
  description: "MJFIRD — breaker, designer, builder.",
};

export default async function AboutPage() {
  const [profile, settings] = await Promise.all([getProfile(), getSiteSettings()]);

  const paragraphs = settings.aboutDescription
    ? settings.aboutDescription
        .split("\n\n")
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : [profile.bio];

  return (
    <div>
      <div className="container-page grid gap-10 pb-[var(--space-section)] pt-14 sm:pt-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal>
          {profile.avatarUrl ? (
            <Avatar
              src={profile.avatarUrl}
              alt={profile.name}
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[4/5] w-full"
            />
          ) : (
            <div className="aspect-[4/5] w-full border border-line bg-bg-raised-2" />
          )}
        </Reveal>

        <Reveal delay={80} className="flex flex-col justify-center gap-6">
          <p className="eyebrow eyebrow-accent">About</p>
          <h1 className="display-lg max-w-2xl">{settings.aboutHeadline}</h1>
          <div className="flex max-w-xl flex-col gap-4">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="text-body-lg text-pretty text-ink-muted">
                {paragraph}
              </p>
            ))}
          </div>
          {settings.aboutCtaLabel && (
            <div className="mt-2">
              <MagneticButton href={settings.aboutCtaUrl} variant="secondary" arrow cursorLabel="view">
                {settings.aboutCtaLabel}
              </MagneticButton>
            </div>
          )}
        </Reveal>
      </div>

      <div className="border-y border-line bg-bg-raised/60">
        <div className="container-page py-[var(--space-section)]">
          <SectionHeader index={1} eyebrow="Timeline" title="How I got here" />
          <ol className="flex flex-col">
            {settings.aboutTimeline.map((item, i) => (
              <Reveal
                as="li"
                key={item.year}
                delay={i * 50}
                className="grid grid-cols-[4.5rem_1fr] gap-6 border-t border-line py-7 last:border-b sm:grid-cols-[9rem_1fr]"
              >
                <span className="mono-meta pt-1 text-accent">{item.year}</span>
                <div>
                  <h3 className="display-sm">{item.label}</h3>
                  <p className="mt-1.5 max-w-2xl text-body-sm text-pretty text-ink-muted">{item.detail}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>

      <div className="container-page py-[var(--space-section)]">
        <SectionHeader index={2} eyebrow="Toolkit" title="What I work with" />
        <div className="flex flex-wrap gap-2.5">
          {settings.aboutSkills.map((skill, i) => (
            <Reveal
              key={skill}
              delay={Math.min(i * 30, 240)}
              className="spec border border-line px-3.5 py-2 transition-colors duration-[var(--duration-fast)] hover:border-line-strong hover:text-ink"
            >
              {skill}
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
