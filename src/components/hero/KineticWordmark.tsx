"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PRELOADER_SESSION_KEY, PRELOADER_DURATION } from "@/lib/preloader";

const WORD = "MJFIRD";

export default function KineticWordmark() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const letters = lettersRef.current.filter(Boolean) as HTMLSpanElement[];
    if (!letters.length) return;

    if (reducedMotion) {
      gsap.set(letters, { opacity: 1, y: 0, scaleY: 1, filter: "blur(0px)" });
      return;
    }

    const alreadySeen = sessionStorage.getItem(PRELOADER_SESSION_KEY);
    const delay = alreadySeen ? 0.1 : PRELOADER_DURATION;

    const tl = gsap.timeline({ delay });
    tl.set(letters, { opacity: 0, yPercent: 55, scaleY: 1.6, filter: "blur(14px)" }).to(letters, {
      opacity: 1,
      yPercent: 0,
      scaleY: 1,
      filter: "blur(0px)",
      duration: 0.68,
      ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      stagger: 0.055,
    });

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  // Cursor reactivity: subtle toprock-style sway, skipped for reduced motion.
  useEffect(() => {
    if (reducedMotion) return;
    const section = sectionRef.current;
    const letters = lettersRef.current.filter(Boolean) as HTMLSpanElement[];
    if (!section || !letters.length) return;

    const movers = letters.map((el, i) =>
      gsap.quickTo(el, "x", { duration: 0.5 + i * 0.02, ease: "power3.out" }),
    );
    const moversY = letters.map((el, i) =>
      gsap.quickTo(el, "y", { duration: 0.5 + i * 0.02, ease: "power3.out" }),
    );

    const handleMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      const relX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const relY = (e.clientY - rect.top - rect.height / 2) / rect.height;
      letters.forEach((_, i) => {
        movers[i](relX * 14);
        moversY[i](relY * 8);
      });
    };

    const handleLeave = () => {
      letters.forEach((_, i) => {
        movers[i](0);
        moversY[i](0);
      });
    };

    section.addEventListener("mousemove", handleMove);
    section.addEventListener("mouseleave", handleLeave);
    return () => {
      section.removeEventListener("mousemove", handleMove);
      section.removeEventListener("mouseleave", handleLeave);
    };
  }, [reducedMotion]);

  return (
    <div ref={sectionRef} className="select-none">
      <h1
        className="font-display flex flex-wrap text-display-xl font-black uppercase leading-[0.85] tracking-tight text-ink"
        aria-label={WORD}
      >
        {WORD.split("").map((char, i) => (
          <span
            key={`${char}-${i}`}
            ref={(el) => {
              lettersRef.current[i] = el;
            }}
            className="inline-block will-change-transform"
            aria-hidden="true"
          >
            {char}
          </span>
        ))}
      </h1>
    </div>
  );
}
