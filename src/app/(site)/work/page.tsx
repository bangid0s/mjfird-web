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
    <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
      <SectionHeader eyebrow="Selected Work" title="Everything I've shipped" />
      <WorkGrid projects={projects} />
    </div>
  );
}
