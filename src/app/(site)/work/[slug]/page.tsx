import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjects, getProject } from "@/lib/data/projects";
import EditorialTemplate from "@/components/case-study/EditorialTemplate";
import ImmersiveTemplate from "@/components/case-study/ImmersiveTemplate";
import SystemsTemplate from "@/components/case-study/SystemsTemplate";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site-url";

const BASE_URL = SITE_URL;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.hook,
    openGraph: { title: project.title, description: project.hook },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const projects = await getProjects();
  const index = projects.findIndex((p) => p.slug === slug);
  if (index === -1) notFound();

  const project = projects[index];
  const next = projects[(index + 1) % projects.length];

  const jsonLd = (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          description: project.hook,
          creator: { "@type": "Person", name: "MJFIRD" },
          about: project.category,
          url: `${BASE_URL}/work/${project.slug}`,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Work", item: `${BASE_URL}/work` },
            { "@type": "ListItem", position: 2, name: project.title, item: `${BASE_URL}/work/${project.slug}` },
          ],
        }}
      />
    </>
  );

  switch (project.template) {
    case "immersive":
      return (
        <>
          {jsonLd}
          <ImmersiveTemplate project={project} next={next} />
        </>
      );
    case "systems":
      return (
        <>
          {jsonLd}
          <SystemsTemplate project={project} next={next} />
        </>
      );
    default:
      return (
        <>
          {jsonLd}
          <EditorialTemplate project={project} next={next} />
        </>
      );
  }
}
