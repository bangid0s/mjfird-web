import Link from "next/link";
import type { Project } from "@/lib/placeholder-data";

export default function CaseStudyNext({ project }: { project: Project }) {
  return (
    <div className="border-t border-line">
      <Link
        href={`/work/${project.slug}`}
        data-cursor="view"
        className="group container-page flex flex-col gap-4 py-[var(--space-section)]"
      >
        <p className="eyebrow eyebrow-accent">Next up</p>
        <h3 className="display-lg flex flex-wrap items-center gap-x-5 transition-colors duration-[var(--duration-base)] group-hover:text-accent">
          {project.title}
          <span
            aria-hidden="true"
            className="text-ink-faint transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-2 group-hover:text-accent"
          >
            →
          </span>
        </h3>
      </Link>
    </div>
  );
}
