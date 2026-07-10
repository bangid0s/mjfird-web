import { createClient } from "@/lib/supabase/server";
import ProjectsList from "@/components/admin/ProjectsList";
import PageHeader, { HeaderAction } from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import type { ProjectRow } from "@/lib/supabase/types";

export default async function AdminProjectsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true });

  const projects = (data as ProjectRow[]) ?? [];

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Drag to reorder. ★ marks projects featured on the homepage."
        action={<HeaderAction href="/admin/projects/new">New project</HeaderAction>}
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Your case studies live here. Add your first project and it shows up on the homepage and /work."
          ctaHref="/admin/projects/new"
          ctaLabel="Create your first project"
        />
      ) : (
        <ProjectsList projects={projects} />
      )}
    </div>
  );
}
