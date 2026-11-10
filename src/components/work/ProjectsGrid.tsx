"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FilterChips from "@/components/ui/FilterChips";
import ProjectCard from "@/components/ui/ProjectCard";
import type { Project } from "@/lib/placeholder-data";
import { easeFreeze } from "@/lib/motion";
import { cn } from "@/lib/cn";

/*
  Shared by /work and the homepage's featured strip, which were two copies of
  the same component before.

  Large 4:3 cards, every piece framed the same way, two across by default;
  `columns` can ask for three at the widest breakpoint. A wide "lead" card was tried here and
  dropped: at desktop width it filled the
  viewport on its own, so nothing else was visible without scrolling, and the
  crop it needed cut vertical illustration in half.
*/

export default function ProjectsGrid({
  projects,
  columns = 2,
  showFilter = true,
  emptyHint = "check back soon",
}: {
  projects: Project[];
  /** Widest breakpoint's column count. Three reads as an index, two as a feature. */
  columns?: 2 | 3;
  /** The homepage shows a fixed handful, so it carries no filter. */
  showFilter?: boolean;
  emptyHint?: string;
}) {
  const [filter, setFilter] = useState("All");

  const categories = useMemo(
    () => Array.from(new Set(projects.map((p) => p.category))),
    [projects],
  );

  const filtered =
    filter === "All" ? projects : projects.filter((p) => p.category === filter);

  const hasFilter = showFilter && categories.length > 0;

  return (
    <div className="flex flex-col gap-10">
      {hasFilter && <FilterChips options={categories} onChange={setFilter} />}

      <div
        className={cn(
          "grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-y-16",
          columns === 3 && "lg:grid-cols-3",
        )}
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((project, i) => (
            <motion.div
              key={project.slug}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.34, ease: easeFreeze }}
            >
              <ProjectCard project={project} priority={i < 2} columns={columns} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-line px-6 py-14 text-center text-body-sm text-ink-muted">
          Nothing tagged &ldquo;{filter}&rdquo; yet — {emptyHint}.
        </p>
      )}
    </div>
  );
}
