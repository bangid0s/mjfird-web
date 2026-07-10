import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectForm from "@/components/admin/ProjectForm";
import { updateProject } from "@/lib/admin/projects-actions";
import type { ProjectRow } from "@/lib/supabase/types";
import PageHeader from "@/components/admin/PageHeader";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single<ProjectRow>();

  if (!project) notFound();

  return (
    <div>
      <PageHeader title="Edit project" backHref="/admin/projects" backLabel="Projects" />
      <ProjectForm project={project} action={updateProject.bind(null, id)} />
    </div>
  );
}
