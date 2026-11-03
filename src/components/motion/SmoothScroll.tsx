"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

// The live instance, for controls that need to scroll the page themselves
// (a native smooth scrollTo fights Lenis for the position).
let active: Lenis | null = null;
export function scrollToTop() {
  if (active) active.scrollTo(0);
  else window.scrollTo({ top: 0 });
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    active = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      if (active === lenis) active = null;
      gsap.ticker.remove(lenis.raf as unknown as gsap.TickerCallback);
    };
  }, [reducedMotion]);

  return <>{children}</>;
}
