import Link from "next/link";
import SmartImage from "@/components/media/SmartImage";
import type { Project } from "@/lib/placeholder-data";

/*
  The work card is the whole argument on an illustrator's site, so the image
  gets the space: a large 4:3 frame with the title underneath, rather than the
  224px thumbnail in a list row this replaces. Every card is framed the same
  way — a portfolio grid shouldn't rank its own pieces by crop.

  Nothing is painted on top of the artwork. The index and the hover affordance
  used to sit on the image as translucent chips; they live in the meta line
  below it now, so the cover renders at full colour with nothing over it.
*/

export default function ProjectCard({
  project,
  index,
  priority = false,
}: {
  project: Project;
  index: number;
  priority?: boolean;
}) {
  const hasCover = Boolean(project.cover) && !project.cover.startsWith("/placeholder");

  return (
    <Link
      href={`/work/${project.slug}`}
      data-cursor="view"
      className="group flex flex-col gap-5"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bg-raised-2 transition-colors duration-[var(--duration-fast)] group-hover:border-line-strong">
        {hasCover ? (
          <SmartImage
            src={project.cover}
            alt={project.title}
            priority={priority}
            sizes="(min-width: 1280px) 620px, (min-width: 640px) 46vw, 100vw"
            className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bg-raised to-bg-raised-2 transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]">
            <span className="eyebrow">{project.category}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="display-sm transition-colors duration-[var(--duration-fast)] group-hover:text-accent">
            {project.title}
          </h3>
          <span className="rounded-full border border-line px-2.5 py-1 text-label font-medium text-ink-faint">
            {project.category}
          </span>
        </div>

        <p className="max-w-xl text-body-sm text-pretty text-ink-muted">{project.hook}</p>

        <div className="mt-1 flex items-center justify-between gap-4">
          <p className="mono-meta">
            {String(index + 1).padStart(2, "0")}
            <span className="px-2 opacity-50">/</span>
            {project.client}
            <span className="px-2 opacity-50">/</span>
            {project.year}
          </p>
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center gap-1.5 text-body-sm font-medium text-accent opacity-0 transition-[opacity,transform] duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-0 group-hover:opacity-100 sm:translate-x-2"
          >
            View project →
          </span>
        </div>
      </div>
    </Link>
  );
}
