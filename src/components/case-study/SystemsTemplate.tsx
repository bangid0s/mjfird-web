import type { Project } from "@/lib/placeholder-data";
import CaseStudyMeta from "@/components/case-study/CaseStudyMeta";
import CaseStudyNext from "@/components/case-study/CaseStudyNext";
import CaseStudyNarrative from "@/components/case-study/CaseStudyNarrative";
import MediaSlot from "@/components/case-study/MediaSlot";
import ProjectGallery from "@/components/media/ProjectGallery";

export default function SystemsTemplate({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  const hasCover = project.cover && !project.cover.startsWith("/placeholder");

  return (
    <article>
      <header className="mx-auto max-w-6xl px-6 pt-16 pb-12 sm:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-4 font-mono text-label uppercase tracking-[0.25em] text-accent">
              {project.category}
            </p>
            <h1 className="font-display text-display-lg uppercase leading-[0.9] text-ink">
              {project.title}
            </h1>
          </div>
          <p className="max-w-sm font-body text-body text-ink-muted">{project.hook}</p>
        </div>
      </header>

      {hasCover && (
        <div className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
          <MediaSlot
            image={{ url: project.cover, alt: project.title }}
            className="aspect-[16/9] w-full"
            sizes="(min-width: 1024px) 1152px, 100vw"
          />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
        <CaseStudyMeta project={project} />
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-16 sm:px-10">
        <CaseStudyNarrative narrative={project.narrative} />
      </div>

      {project.gallery && project.gallery.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pb-4 sm:px-10">
          <p className="mb-6 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
            The system, applied
          </p>
        </div>
      )}

      {project.gallery && project.gallery.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
          <ProjectGallery images={project.gallery} />
        </div>
      )}

      <CaseStudyNext project={next} />
    </article>
  );
}
