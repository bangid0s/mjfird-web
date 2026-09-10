import ProjectsGrid from "@/components/work/ProjectsGrid";
import type { Project } from "@/lib/placeholder-data";

export default function FeaturedWork({ projects }: { projects: Project[] }) {
  // On the homepage a filter with a single option is just noise.
  return <ProjectsGrid projects={projects} showFilterWhenSingleCategory={false} />;
}
