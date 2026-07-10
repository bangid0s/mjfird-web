import ProjectForm from "@/components/admin/ProjectForm";
import { createProject } from "@/lib/admin/projects-actions";
import PageHeader from "@/components/admin/PageHeader";

export default function NewProjectPage() {
  return (
    <div>
      <PageHeader title="New project" backHref="/admin/projects" backLabel="Projects" />
      <ProjectForm action={createProject} />
    </div>
  );
}
