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
import Reveal from "@/components/motion/Reveal";
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
      yPercent: 14,
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
      <section className="relative flex h-[92svh] items-end overflow-hidden">
        <div
          ref={heroImgRef}
          className="absolute inset-0 -top-[8%] h-[116%] bg-gradient-to-br from-bg-raised via-bg-raised-2 to-bg"
        >
          {hasCover && (
            <SmartImage src={project.cover} sizes="100vw" priority className="object-cover" />
          )}
        </div>

        {/* Scrim: strong at the base where the title sits, gone by mid-frame. */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/45 to-transparent" />

        <div className="container-page relative z-[var(--z-content)] w-full pb-16 sm:pb-20">
          <p className="eyebrow eyebrow-accent mb-5">{project.category}</p>
          <h1 className="display-xl max-w-4xl">{project.title}</h1>
          <p className="mt-6 max-w-xl text-body-lg text-pretty text-ink-muted">{project.hook}</p>
        </div>
      </section>

      <div className="container-page py-14">
        <CaseStudyMeta project={project} />
      </div>

      <div className="container-page pb-16">
        <div className="max-w-3xl">
          <CaseStudyNarrative narrative={project.narrative} />
        </div>
      </div>

      {project.gallery && project.gallery.length > 0 && (
        <Reveal className="container-page pb-[var(--space-section)]">
          <ProjectGallery images={project.gallery} />
        </Reveal>
      )}

      <CaseStudyNext project={next} />
    </article>
  );
}
