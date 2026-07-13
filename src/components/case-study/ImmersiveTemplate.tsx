"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Project } from "@/lib/placeholder-data";
import CaseStudyMeta from "@/components/case-study/CaseStudyMeta";
import CaseStudyNext from "@/components/case-study/CaseStudyNext";
import CaseStudyNarrative from "@/components/case-study/CaseStudyNarrative";
import SmartImage from "@/components/media/SmartImage";
import ProjectGallery from "@/components/media/ProjectGallery";
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
  const hasCover = project.cover && !project.cover.startsWith("/placeholder");

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
          {hasCover && <SmartImage src={project.cover} sizes="100vw" priority className="object-cover" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
        <div className="relative z-[var(--z-content)] mx-auto w-full max-w-6xl px-6 pb-16 sm:px-10">
          <p className="mb-4 font-mono text-label uppercase tracking-[0.25em] text-accent">
            {project.category}
          </p>
          <h1 className="font-display text-display-xl uppercase leading-[0.82] text-ink">
            {project.title}
          </h1>
          <p className="mt-6 max-w-xl font-body text-body-lg text-ink-muted">{project.hook}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <CaseStudyMeta project={project} />
      </div>

      <div className="mx-auto max-w-3xl px-6 pb-16 sm:px-10">
        <CaseStudyNarrative narrative={project.narrative} />
      </div>

      {project.gallery && project.gallery.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
          <ProjectGallery images={project.gallery} />
        </div>
      )}

      <CaseStudyNext project={next} />
    </article>
  );
}
