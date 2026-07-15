"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FilterChips from "@/components/ui/FilterChips";
import ProjectCard from "@/components/ui/ProjectCard";
import type { Project } from "@/lib/placeholder-data";
import { easeFreeze } from "@/lib/motion";

export default function FeaturedWork({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState("All");

  const categories = useMemo(
    () => Array.from(new Set(projects.map((p) => p.category))),
    [projects],
  );

  const filtered =
    filter === "All" ? projects : projects.filter((p) => p.category === filter);

  return (
    <div className="flex flex-col gap-12">
      {categories.length > 1 && (
        <FilterChips options={categories} onChange={setFilter} />
      )}
      <div className="flex flex-col">
        <AnimatePresence mode="popLayout">
          {filtered.map((project, i) => (
            <motion.div
              key={project.slug}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.38, ease: easeFreeze }}
            >
              <ProjectCard project={project} index={i} />
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="border-t border-line py-12 font-mono text-body-sm text-ink-muted">
            Nothing tagged &ldquo;{filter}&rdquo; yet — check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
