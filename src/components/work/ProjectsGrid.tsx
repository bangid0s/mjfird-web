"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FilterChips from "@/components/ui/FilterChips";
import ProjectCard from "@/components/ui/ProjectCard";
import type { Project } from "@/lib/placeholder-data";
import { easeFreeze } from "@/lib/motion";

/*
  Shared by /work and the homepage's featured strip, which were two copies of
  the same component before.

  Two columns of large 4:3 cards, every piece framed the same way. A wide
  "lead" card was tried here and dropped: at desktop width it filled the
  viewport on its own, so nothing else was visible without scrolling, and the
  crop it needed cut vertical illustration in half.
*/

export default function ProjectsGrid({
  projects,
  showFilterWhenSingleCategory = true,
  emptyHint = "check back soon",
}: {
  projects: Project[];
  /** The homepage hides a filter that would only ever have one option. */
  showFilterWhenSingleCategory?: boolean;
  emptyHint?: string;
}) {
  const [filter, setFilter] = useState("All");

  const categories = useMemo(
    () => Array.from(new Set(projects.map((p) => p.category))),
    [projects],
  );

  const filtered =
    filter === "All" ? projects : projects.filter((p) => p.category === filter);

  const showFilter = showFilterWhenSingleCategory
    ? categories.length > 0
    : categories.length > 1;

  return (
    <div className="flex flex-col gap-10">
      {showFilter && <FilterChips options={categories} onChange={setFilter} />}

      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 sm:gap-y-16">
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
              <ProjectCard project={project} index={i} priority={i < 2} />
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
