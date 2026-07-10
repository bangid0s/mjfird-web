"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PRELOADER_SESSION_KEY as SESSION_KEY } from "@/lib/preloader";

export default function Preloader() {
  const [shouldShow, setShouldShow] = useState(false);
  const [done, setDone] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
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

    const counter = { value: 0 };
    const tl = gsap.timeline({
      onComplete: () => setDone(true),
    });

    tl.to(counter, {
      value: 100,
      duration: 1.1,
      ease: "power2.inOut",
      onUpdate: () => {
        if (countRef.current) countRef.current.textContent = String(Math.round(counter.value));
        if (barRef.current) barRef.current.style.transform = `scaleX(${counter.value / 100})`;
      },
    }).to(wrapRef.current, {
      yPercent: -100,
      duration: 0.68,
      ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      delay: 0.1,
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
      className="fixed inset-0 z-[var(--z-preloader)] flex flex-col items-center justify-center gap-6 bg-bg"
      role="status"
      aria-label="Loading"
    >
      <div className="font-mono text-label uppercase tracking-[0.3em] text-ink-muted">
        MJFIRD — cueing up
      </div>
      <div className="relative h-[3px] w-48 -rotate-1 bg-line sm:w-64">
        <div
          ref={barRef}
          className="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-accent"
        />
      </div>
      <div className="font-mono text-sm text-ink">
        <span ref={countRef}>0</span>%
      </div>
      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-8 right-8 font-mono text-label uppercase tracking-[0.15em] text-ink-faint transition-colors duration-[var(--duration-fast)] hover:text-accent"
      >
        Skip
      </button>
    </div>
  );
}
