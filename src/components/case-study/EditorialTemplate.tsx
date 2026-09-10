import type { Project } from "@/lib/placeholder-data";
import CaseStudyMeta from "@/components/case-study/CaseStudyMeta";
import CaseStudyNext from "@/components/case-study/CaseStudyNext";
import CaseStudyNarrative from "@/components/case-study/CaseStudyNarrative";
import MediaSlot from "@/components/case-study/MediaSlot";
import ProjectGallery from "@/components/media/ProjectGallery";
import Reveal from "@/components/motion/Reveal";

export default function EditorialTemplate({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  const hasCover = project.cover && !project.cover.startsWith("/placeholder");

  return (
    <article>
      <header className="container-prose pb-12 pt-16 sm:pt-24">
        <p className="eyebrow eyebrow-accent mb-5">{project.category}</p>
        <h1 className="display-lg">{project.title}</h1>
        <p className="mt-6 max-w-xl text-body-lg text-pretty text-ink-muted">{project.hook}</p>
      </header>

      {hasCover && (
        <Reveal className="container-page max-w-6xl">
          <MediaSlot
            image={{ url: project.cover, alt: project.title }}
            className="aspect-[16/10] w-full"
            sizes="(min-width: 1024px) 1024px, 100vw"
          />
        </Reveal>
      )}

      <div className="container-prose py-14">
        <CaseStudyMeta project={project} />
      </div>

      <div className="container-prose pb-16">
        <CaseStudyNarrative narrative={project.narrative} />
      </div>

      {project.gallery && project.gallery.length > 0 && (
        <Reveal className="container-page max-w-6xl pb-[var(--space-section)]">
          <ProjectGallery images={project.gallery} />
        </Reveal>
      )}

      <CaseStudyNext project={next} />
    </article>
  );
}
