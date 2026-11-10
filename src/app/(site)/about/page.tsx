import type { Metadata } from "next";
import Avatar from "@/components/ui/Avatar";
import SectionHeader from "@/components/ui/SectionHeader";
import MagneticButton from "@/components/ui/MagneticButton";
import Reveal from "@/components/motion/Reveal";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Timeline from "@/components/about/Timeline";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "About",
  description: "About M.J. Fird: illustrator and graphic designer based in Indonesia.",
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

      {settings.stats.length > 0 && (
        <div className="border-t border-line">
          <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-4">
            {settings.stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 60}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} label={stat.label} />
              </Reveal>
            ))}
          </div>
        </div>
      )}

      <div className="border-y border-line bg-bg-raised/60">
        <div className="container-page py-[var(--space-section)]">
          <SectionHeader index={1} eyebrow="Timeline" title="How I got here" />
          <Timeline items={settings.aboutTimeline} />
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
