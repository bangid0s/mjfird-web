import Image from "next/image";
import type { Project } from "@/lib/placeholder-data";
import CaseStudyMeta from "@/components/case-study/CaseStudyMeta";
import CaseStudyNext from "@/components/case-study/CaseStudyNext";

const APPLICATIONS = ["Flyer", "Social tile", "Business card", "Signage", "Merch", "Web banner"];

export default function SystemsTemplate({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  return (
    <article>
      <header className="mx-auto max-w-6xl px-6 pt-16 pb-12 sm:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 font-mono text-label uppercase tracking-[0.25em] text-accent">
              {project.category}
            </p>
            <h1 className="font-display text-display-lg uppercase leading-[0.9] text-ink">
              {project.title}
            </h1>
          </div>
          <p className="max-w-sm font-body text-body text-ink-muted">{project.hook}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
        <CaseStudyMeta project={project} />
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
        <p className="max-w-2xl font-body text-body-lg leading-relaxed text-ink">
          {project.narrative.context} {project.narrative.move}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-4 sm:px-10">
        <p className="mb-6 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
          The system, applied
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3">
        {(project.gallery?.length
          ? project.gallery.map((image, i) => ({ label: image.alt || APPLICATIONS[i % APPLICATIONS.length], image }))
          : APPLICATIONS.map((app) => ({ label: app, image: undefined }))
        ).map((cell, i) => (
          <div
            key={`${cell.label}-${i}`}
            className="group relative flex aspect-square flex-col justify-end overflow-hidden bg-bg p-4 transition-colors duration-[var(--duration-base)] hover:bg-bg-raised"
          >
            {cell.image && (
              <>
                <Image
                  src={cell.image.url}
                  alt={cell.image.alt ?? ""}
                  fill
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-bg/90 to-transparent" />
              </>
            )}
            <span className="relative font-mono text-label uppercase tracking-[0.1em] text-ink-faint transition-colors group-hover:text-accent">
              {cell.label}
            </span>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint">The build</p>
        <p className="mt-4 max-w-2xl font-body text-body-lg leading-relaxed text-ink">
          {project.narrative.build}
        </p>
      </section>

      <section className="mx-auto max-w-6xl border-t border-line px-6 py-16 sm:px-10">
        <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint">Result</p>
        <p className="mt-4 max-w-2xl font-body text-body-lg leading-relaxed text-ink">
          {project.narrative.result}
        </p>
      </section>

      <CaseStudyNext project={next} />
    </article>
  );
}
