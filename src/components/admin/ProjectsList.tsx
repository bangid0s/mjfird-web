"use client";

import Link from "next/link";
import { reorderProjects, deleteProject, toggleFeatured } from "@/lib/admin/projects-actions";
import ReorderableList from "@/components/admin/ReorderableList";
import DeleteButton from "@/components/admin/DeleteButton";
import StatusBadge from "@/components/admin/StatusBadge";
import { cn } from "@/lib/cn";
import type { ProjectRow } from "@/lib/supabase/types";

export default function ProjectsList({ projects }: { projects: ProjectRow[] }) {
  return (
    <ReorderableList
      items={projects}
      onReorder={reorderProjects}
      renderRow={(project) => (
        <div className="flex items-center gap-4">
          {project.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.cover_image}
              alt=""
              className="h-12 w-16 shrink-0 border border-line object-cover"
            />
          ) : (
            <div className="flex h-12 w-16 shrink-0 items-center justify-center border border-line bg-bg-raised font-mono text-[9px] uppercase text-ink-faint">
              No cover
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/projects/${project.id}`}
                className="truncate font-body text-body text-ink transition-colors hover:text-accent"
              >
                {project.title}
              </Link>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
              {[project.client, project.year, project.template].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <form action={toggleFeatured.bind(null, project.id, !project.featured)}>
              <button
                type="submit"
                title={project.featured ? "Remove from homepage" : "Feature on homepage"}
                className={cn(
                  "font-mono text-label uppercase tracking-[0.1em]",
                  project.featured ? "text-accent" : "text-ink-faint hover:text-ink",
                )}
              >
                {project.featured ? "★" : "☆"}
              </button>
            </form>
            <a
              href={`/work/${project.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden font-mono text-label uppercase tracking-[0.1em] text-ink-faint hover:text-ink sm:inline"
            >
              View
            </a>
            <Link
              href={`/admin/projects/${project.id}`}
              className="font-mono text-label uppercase tracking-[0.1em] text-ink-muted hover:text-ink"
            >
              Edit
            </Link>
            <DeleteButton action={deleteProject.bind(null, project.id)} />
          </div>
        </div>
      )}
    />
  );
}
