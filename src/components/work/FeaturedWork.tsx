import ProjectsGrid from "@/components/work/ProjectsGrid";
import type { Project } from "@/lib/placeholder-data";

export default function FeaturedWork({ projects }: { projects: Project[] }) {
  // A handful, two across at every width: the commissions lead the homepage
  // now, so on a phone this is a short strip rather than a column of covers.
  // A filter over a handful of items is just noise.
  return (
    <ProjectsGrid projects={projects.slice(0, 6)} columns={2} showFilter={false} dense />
  );
}
