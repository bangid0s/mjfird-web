"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Project } from "@/lib/placeholder-data";
import CaseStudyMeta from "@/components/case-study/CaseStudyMeta";
import CaseStudyNext from "@/components/case-study/CaseStudyNext";
import MediaSlot from "@/components/case-study/MediaSlot";
import SmartImage from "@/components/media/SmartImage";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export default function ImmersiveTemplate({
  project,
  next,
}: {
  project: Project;
  next: Project;
}) {
  const heroImgRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion || !heroImgRef.current) return;
    const tween = gsap.to(heroImgRef.current, {
      yPercent: 18,
      ease: "none",
      scrollTrigger: {
        trigger: heroImgRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
    return () => {
      tween.kill();
    };
  }, [reducedMotion]);

  return (
    <article>
      <section className="relative flex h-[90svh] items-end overflow-hidden">
        <div
          ref={heroImgRef}
          className="absolute inset-0 -top-[10%] h-[120%] bg-gradient-to-br from-bg-raised via-bg-raised-2 to-bg"
        >
          {project.cover && !project.cover.startsWith("/placeholder") && (
            <SmartImage src={project.cover} sizes="100vw" priority className="object-cover" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
        <div className="relative z-[var(--z-content)] mx-auto w-full max-w-6xl px-6 pb-16 sm:px-10">
          <p className="mb-4 font-mono text-label uppercase tracking-[0.25em] text-accent">
            {project.category}
          </p>
          <h1 className="font-display text-display-xl uppercase leading-[0.82] text-ink">
            {project.title}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <CaseStudyMeta project={project} />
      </div>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 sm:grid-cols-[minmax(0,1fr)_320px] sm:px-10">
        <MediaSlot image={project.gallery?.[0]} className="aspect-[16/9]" sizes="(min-width: 640px) 70vw, 100vw" />
        <div className="sm:sticky sm:top-28 sm:self-start">
          <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint">Context</p>
          <p className="mt-3 font-body text-body text-ink-muted">{project.narrative.context}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
        <p className="max-w-2xl font-display text-display-sm uppercase leading-[1.05] text-ink">
          {project.narrative.move}
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-3 sm:px-10">
        <MediaSlot
          image={project.gallery?.[1]}
          className="aspect-[3/4] sm:col-span-2 sm:aspect-auto sm:min-h-[420px]"
          sizes="(min-width: 640px) 66vw, 100vw"
        />
        <MediaSlot image={project.gallery?.[2]} className="aspect-[3/4]" sizes="(min-width: 640px) 33vw, 100vw" />
      </section>

      {(project.gallery?.length ?? 0) > 3 && (
        <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-2 sm:px-10">
          {project.gallery!.slice(3).map((image, i) => (
            <MediaSlot
              key={`${image.url}-${i}`}
              image={image}
              className="aspect-[16/10]"
              sizes="(min-width: 640px) 50vw, 100vw"
            />
          ))}
        </section>
      )}

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 sm:grid-cols-[320px_minmax(0,1fr)] sm:px-10">
        <div>
          <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint">The build</p>
        </div>
        <p className="font-body text-body-lg leading-relaxed text-ink">{project.narrative.build}</p>
      </section>

      <section className="mx-auto max-w-6xl border-t border-line px-6 py-16 sm:px-10">
        <p className="font-mono text-label uppercase tracking-[0.2em] text-ink-faint">Result</p>
        <p className="mt-4 max-w-2xl font-body text-body-lg leading-relaxed text-ink">
          {project.narrative.result}
        </p>
      </section>

      <CaseStudyNext project={next} />
    </article>
  );
}
