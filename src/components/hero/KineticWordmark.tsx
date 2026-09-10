"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PRELOADER_SESSION_KEY, PRELOADER_DURATION } from "@/lib/preloader";

const WORD = "MJFIRD";

/*
  The wordmark still enters letter by letter, but as a mask reveal — each glyph
  slides up out of its own clipped box — instead of the blur-and-scale it used
  to do. Cleaner, cheaper to composite, and it reads as typography rather than
  as an effect.
*/

export default function KineticWordmark() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const letters = lettersRef.current.filter(Boolean) as HTMLSpanElement[];
    if (!letters.length) return;

    if (reducedMotion) {
      gsap.set(letters, { yPercent: 0, opacity: 1 });
      return;
    }

    const alreadySeen = sessionStorage.getItem(PRELOADER_SESSION_KEY);
    // Overlaps the tail of the curtain lift so the hero settles ~0.5s sooner.
    const delay = alreadySeen ? 0.06 : PRELOADER_DURATION - 0.35;

    const tl = gsap.timeline({ delay });
    tl.set(letters, { yPercent: 110, opacity: 1 }).to(letters, {
      yPercent: 0,
      duration: 0.6,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
      stagger: 0.035,
    });

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  // A few pixels of pointer parallax — present, but not a toy.
  useEffect(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    const letters = lettersRef.current.filter(Boolean) as HTMLSpanElement[];
    if (!section || !letters.length) return;

    const movers = letters.map((el, i) =>
      gsap.quickTo(el, "x", { duration: 0.6 + i * 0.03, ease: "power3.out" }),
    );

    const handleMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      const relX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      letters.forEach((_, i) => movers[i](relX * 7));
    };

    const handleLeave = () => letters.forEach((_, i) => movers[i](0));

    section.addEventListener("mousemove", handleMove);
    section.addEventListener("mouseleave", handleLeave);
    return () => {
      section.removeEventListener("mousemove", handleMove);
      section.removeEventListener("mouseleave", handleLeave);
    };
  }, [reducedMotion]);

  return (
    <div ref={sectionRef} className="select-none">
      <h1 className="display-xl flex flex-wrap font-semibold uppercase" aria-label={WORD}>
        {WORD.split("").map((char, i) => (
          <span key={`${char}-${i}`} className="inline-block overflow-hidden pb-[0.06em]">
            <span
              ref={(el) => {
                lettersRef.current[i] = el;
              }}
              className="inline-block will-change-transform"
              aria-hidden="true"
            >
              {char}
            </span>
          </span>
        ))}
      </h1>
    </div>
  );
}
