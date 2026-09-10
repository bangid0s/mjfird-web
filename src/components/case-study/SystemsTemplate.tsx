import type { Project } from "@/lib/placeholder-data";
import CaseStudyMeta from "@/components/case-study/CaseStudyMeta";
import CaseStudyNext from "@/components/case-study/CaseStudyNext";
import CaseStudyNarrative from "@/components/case-study/CaseStudyNarrative";
import MediaSlot from "@/components/case-study/MediaSlot";
import ProjectGallery from "@/components/media/ProjectGallery";
import Reveal from "@/components/motion/Reveal";

export default function SystemsTemplate({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  const hasCover = project.cover && !project.cover.startsWith("/placeholder");
  const gallery = project.gallery ?? [];

  return (
    <article>
      <header className="container-page pb-12 pt-16 sm:pt-24">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow eyebrow-accent mb-5">{project.category}</p>
            <h1 className="display-lg max-w-3xl">{project.title}</h1>
          </div>
          <p className="max-w-sm text-body-lg text-pretty text-ink-muted">{project.hook}</p>
        </div>
      </header>

      {hasCover && (
        <Reveal className="container-page pb-14">
          <MediaSlot
            image={{ url: project.cover, alt: project.title }}
            className="aspect-[16/9] w-full"
            sizes="(min-width: 1024px) 1152px, 100vw"
          />
        </Reveal>
      )}

      <div className="container-page pb-14">
        <CaseStudyMeta project={project} />
      </div>

      <div className="container-page pb-16">
        <div className="max-w-3xl">
          <CaseStudyNarrative narrative={project.narrative} />
        </div>
      </div>

      {gallery.length > 0 && (
        <Reveal className="container-page pb-[var(--space-section)]">
          <p className="eyebrow mb-6">The system, applied</p>
          <ProjectGallery images={gallery} />
        </Reveal>
      )}

      <CaseStudyNext project={next} />
    </article>
  );
}
