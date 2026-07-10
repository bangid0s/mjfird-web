import Link from "next/link";
import Image from "next/image";
import type { Project } from "@/lib/placeholder-data";

export default function ProjectCard({ project, index }: { project: Project; index: number }) {
  const hasCover = project.cover?.startsWith("http");

  return (
    <Link
      href={`/work/${project.slug}`}
      data-cursor="view"
      className="group relative flex flex-col gap-4 border-t border-line py-8 first:border-t-0 sm:flex-row sm:items-center sm:gap-10"
    >
      <span className="font-mono text-label text-ink-faint sm:w-10">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-raised sm:w-56">
        {hasCover ? (
          <Image
            src={project.cover}
            alt={project.title}
            fill
            sizes="(min-width: 640px) 224px, 100vw"
            className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bg-raised to-bg-raised-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-110">
            {project.category}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <h3 className="font-display text-display-sm uppercase leading-[0.95] text-ink transition-colors duration-[var(--duration-fast)] group-hover:text-accent">
          {project.title}
        </h3>
        <p className="max-w-md font-body text-body-sm text-ink-muted">{project.hook}</p>
        <div className="flex gap-4 font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
          <span>{project.client}</span>
          <span>{project.year}</span>
        </div>
      </div>

      <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-faint opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100 sm:text-ink">
        View →
      </span>
    </Link>
  );
}
