import type { Metadata } from "next";
import SectionHeader from "@/components/ui/SectionHeader";
import WorkGrid from "@/components/work/WorkGrid";
import { getProjects } from "@/lib/data/projects";

export const metadata: Metadata = {
  title: "Work",
  description: "Brand, motion, and web projects by MJFIRD.",
};

export default async function WorkPage() {
  const projects = await getProjects();

  return (
    <div className="container-page pb-[var(--space-section)] pt-14 sm:pt-20">
      <SectionHeader
        index={1}
        eyebrow="Selected Work"
        title="Everything I've shipped"
        action={
          <p className="mono-meta">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        }
      />
      <WorkGrid projects={projects} />
    </div>
  );
}
