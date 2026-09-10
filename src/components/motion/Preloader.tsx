"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PRELOADER_SESSION_KEY as SESSION_KEY } from "@/lib/preloader";

/*
  A curtain, not a loading bar. The percentage counter it replaces was both
  the most dated element on the site and a second of dead time on every first
  visit; this is a single short brand beat that lifts away, and it still only
  runs once per session.
*/

export default function Preloader() {
  const [shouldShow, setShouldShow] = useState(false);
  const [done, setDone] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // sessionStorage only exists client-side, so this can't be a lazy useState
    // initializer (that would run during SSR and throw) — it must be an effect.
    const alreadySeen = sessionStorage.getItem(SESSION_KEY);
    if (alreadySeen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return;
    }
    setShouldShow(true);
  }, []);

  useEffect(() => {
    if (!shouldShow) return;

    sessionStorage.setItem(SESSION_KEY, "1");

    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return;
    }

    const tl = gsap.timeline({ onComplete: () => setDone(true) });

    tl.fromTo(
      markRef.current,
      { opacity: 0, y: 14, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.42, ease: "power3.out" },
    )
      .fromTo(
        lineRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.42, ease: "power2.inOut" },
        0,
      )
      .to(wrapRef.current, {
        yPercent: -100,
        duration: 0.44,
        ease: "cubic-bezier(0.22, 1, 0.36, 1)",
        delay: 0.08,
      });

    return () => {
      tl.kill();
    };
  }, [shouldShow, reducedMotion]);

  const handleSkip = () => {
    gsap.killTweensOf(wrapRef.current);
    setDone(true);
  };

  if (!shouldShow || done) return null;

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-[var(--z-preloader)] flex flex-col items-center justify-center gap-5 bg-bg"
      role="status"
      aria-label="Loading"
    >
      <div
        ref={markRef}
        className="font-display text-display-md font-semibold tracking-[-0.04em] text-ink"
      >
        MJFIRD
      </div>
      <div className="h-px w-40 overflow-hidden bg-line sm:w-56">
        <div ref={lineRef} className="h-full w-full origin-left scale-x-0 bg-accent" />
      </div>
      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-8 right-6 text-label font-medium text-ink-faint transition-colors duration-[var(--duration-fast)] hover:text-ink sm:right-8"
      >
        Skip
      </button>
    </div>
  );
}
