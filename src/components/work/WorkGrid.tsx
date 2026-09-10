import ProjectsGrid from "@/components/work/ProjectsGrid";
import type { Project } from "@/lib/placeholder-data";

export default function WorkGrid({ projects }: { projects: Project[] }) {
  return <ProjectsGrid projects={projects} />;
}
