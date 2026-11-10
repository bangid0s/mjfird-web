import Link from "next/link";
import SmartImage from "@/components/media/SmartImage";
import type { Project } from "@/lib/placeholder-data";

/*
  The work card is the whole argument on an illustrator's site, so the image
  gets the space: a large 4:3 frame with the title underneath, rather than the
  224px thumbnail in a list row this replaces. Every card is framed the same
  way — a portfolio grid shouldn't rank its own pieces by crop.

  Nothing is painted on top of the artwork, and the caption stays out of its
  way: title, discipline, and who it was for. The pitch sentence lives on the
  project page, where there is room to read it.
*/

export default function ProjectCard({
  project,
  priority = false,
  columns = 2,
}: {
  project: Project;
  priority?: boolean;
  /** Only used to size the image request correctly. */
  columns?: 2 | 3;
}) {
  const hasCover = Boolean(project.cover) && !project.cover.startsWith("/placeholder");
  const byline = [project.client, project.year].filter(Boolean).join(" · ");

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
            sizes={
              columns === 3
                ? "(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 100vw"
                : "(min-width: 1280px) 620px, (min-width: 640px) 46vw, 100vw"
            }
            className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bg-raised to-bg-raised-2 transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.04]">
            <span className="eyebrow">{project.category}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="display-sm transition-colors duration-[var(--duration-fast)] group-hover:text-accent-strong">
            {project.title}
          </h3>
          <span className="spec border border-line px-2 py-1">{project.category}</span>
        </div>
        {byline && <p className="label">{byline}</p>}
      </div>
    </Link>
  );
}
