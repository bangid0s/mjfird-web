import Link from "next/link";
import type { Project } from "@/lib/placeholder-data";

export default function CaseStudyNext({ project }: { project: Project }) {
  return (
    <Link
      href={`/work/${project.slug}`}
      data-cursor="view"
      className="group flex flex-col gap-4 border-t border-line px-6 py-16 sm:px-10"
    >
      <p className="font-mono text-label uppercase tracking-[0.25em] text-ink-muted">
        Next up
      </p>
      <h3 className="font-display text-display-lg uppercase leading-[0.9] text-ink transition-colors duration-[var(--duration-base)] group-hover:text-accent">
        {project.title} →
      </h3>
    </Link>
  );
}
