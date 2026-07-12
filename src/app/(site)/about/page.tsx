import type { Metadata } from "next";
import Image from "next/image";
import SectionHeader from "@/components/ui/SectionHeader";
import MagneticButton from "@/components/ui/MagneticButton";
import { getProfile } from "@/lib/data/profile";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "About",
  description: "MJFIRD — breaker, designer, builder.",
};

export default async function AboutPage() {
  const [profile, settings] = await Promise.all([getProfile(), getSiteSettings()]);

  return (
    <div>
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:grid-cols-[1fr_1.2fr] sm:px-10">
        {profile.avatarUrl ? (
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={profile.avatarUrl}
              alt={profile.name}
              fill
              sizes="(min-width: 640px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-[4/5] w-full bg-gradient-to-br from-bg-raised to-bg-raised-2" />
        )}
        <div className="flex flex-col justify-center gap-6">
          <p className="font-mono text-label uppercase tracking-[0.25em] text-accent">About</p>
          <h1 className="font-display text-display-md uppercase leading-[0.9] text-ink">
            {settings.aboutHeadline}
          </h1>
          {settings.aboutDescription ? (
            <div className="flex max-w-lg flex-col gap-4">
              {settings.aboutDescription
                .split("\n\n")
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i} className="font-body text-body-lg text-ink-muted">
                    {paragraph}
                  </p>
                ))}
            </div>
          ) : (
            <p className="max-w-lg font-body text-body-lg text-ink-muted">{profile.bio}</p>
          )}
          <MagneticButton href="/dance" variant="secondary" cursorLabel="view">
            See the dance side →
          </MagneticButton>
        </div>
      </div>

      <div className="border-t border-line bg-bg-raised">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          <SectionHeader eyebrow="Timeline" title="How I got here" />
          <ol className="flex flex-col">
            {settings.aboutTimeline.map((item) => (
              <li
                key={item.year}
                className="grid grid-cols-[5rem_1fr] gap-6 border-t border-line py-6 last:border-b sm:grid-cols-[8rem_1fr]"
              >
                <span className="font-mono text-body-sm text-accent">{item.year}</span>
                <div>
                  <h3 className="font-display text-lg uppercase text-ink">{item.label}</h3>
                  <p className="mt-1 font-body text-body-sm text-ink-muted">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <SectionHeader eyebrow="Toolkit" title="What I work with" />
        <div className="flex flex-wrap gap-3">
          {settings.aboutSkills.map((skill) => (
            <span
              key={skill}
              className="border border-line px-4 py-2 font-mono text-label uppercase tracking-[0.1em] text-ink-muted"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
