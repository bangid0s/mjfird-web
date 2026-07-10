import type { Project } from "@/lib/placeholder-data";
import CaseStudyMeta from "@/components/case-study/CaseStudyMeta";
import CaseStudyNext from "@/components/case-study/CaseStudyNext";
import MediaSlot from "@/components/case-study/MediaSlot";

export default function EditorialTemplate({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  return (
    <article>
      <header className="mx-auto max-w-3xl px-6 pt-16 pb-12 sm:px-10">
        <p className="mb-6 font-mono text-label uppercase tracking-[0.25em] text-accent">
          {project.category}
        </p>
        <h1 className="font-display text-display-lg uppercase leading-[0.9] text-ink">
          {project.title}
        </h1>
        <p className="mt-6 font-body text-body-lg text-ink-muted">{project.hook}</p>
      </header>

      <div className="mx-auto max-w-3xl px-6 sm:px-10">
        <MediaSlot
          image={project.cover.startsWith("http") ? { url: project.cover, alt: project.title } : undefined}
          className="aspect-[16/10] w-full"
          sizes="(min-width: 768px) 768px, 100vw"
        />
      </div>

      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10">
        <CaseStudyMeta project={project} />
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-16 px-6 pb-24 sm:px-10">
        <section className="flex flex-col gap-4">
          <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint">Context</p>
          <p className="font-body text-body-lg leading-relaxed text-ink">{project.narrative.context}</p>
        </section>

        <blockquote className="border-l-2 border-accent pl-6 font-display text-display-sm uppercase leading-[1.05] text-ink">
          {project.narrative.move}
        </blockquote>

        <section className="flex flex-col gap-4">
          <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint">The build</p>
          <p className="font-body text-body-lg leading-relaxed text-ink">{project.narrative.build}</p>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <MediaSlot image={project.gallery?.[0]} className="aspect-square" sizes="(min-width: 640px) 336px, 50vw" />
          <MediaSlot image={project.gallery?.[1]} className="aspect-square" sizes="(min-width: 640px) 336px, 50vw" />
        </div>

        {(project.gallery?.length ?? 0) > 2 && (
          <div className="flex flex-col gap-4">
            {project.gallery!.slice(2).map((image, i) => (
              <MediaSlot
                key={`${image.url}-${i}`}
                image={image}
                className="aspect-[16/10] w-full"
                sizes="(min-width: 768px) 768px, 100vw"
              />
            ))}
          </div>
        )}

        <section className="flex flex-col gap-4 border-t border-line pt-12">
          <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint">Result</p>
          <p className="font-body text-body-lg leading-relaxed text-ink">{project.narrative.result}</p>
        </section>
      </div>

      <CaseStudyNext project={next} />
    </article>
  );
}
