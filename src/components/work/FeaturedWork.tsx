import ProjectsGrid from "@/components/work/ProjectsGrid";
import type { Project } from "@/lib/placeholder-data";

export default function FeaturedWork({ projects }: { projects: Project[] }) {
  // On the homepage a filter with a single option is just noise, and the
  // strip runs three across so the section reads as an index of recent work.
  return (
    <ProjectsGrid projects={projects} columns={3} showFilterWhenSingleCategory={false} />
  );
}
