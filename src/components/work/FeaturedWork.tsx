import ProjectsGrid from "@/components/work/ProjectsGrid";
import type { Project } from "@/lib/placeholder-data";

export default function FeaturedWork({ projects }: { projects: Project[] }) {
  // Six pieces, two across: on an illustrator's homepage each cover should be
  // big enough to judge, and a filter over six items is just noise.
  return (
    <ProjectsGrid projects={projects.slice(0, 6)} columns={2} showFilter={false} />
  );
}
