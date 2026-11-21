"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

export default function AnimatedNumber({
  value,
  suffix = "",
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const formatted = value.toLocaleString("en-US");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reducedMotion) {
      el.textContent = formatted;
      return;
    }

    // The server HTML already holds the real number, so crawlers, link
    // previews and no-JS readers see "15+", not "0+". Only here, in the
    // browser, does it drop to 0 and count back up when scrolled into view.
    el.textContent = "0";
    const counter = { value: 0 };
    const tween = gsap.to(counter, {
      value,
      duration: 1.4,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
      onUpdate: () => {
        el.textContent = Math.round(counter.value).toLocaleString("en-US");
      },
    });

    return () => {
      tween.kill();
      el.textContent = formatted;
    };
  }, [value, formatted, reducedMotion]);

  return (
    <div className="flex flex-col gap-2.5">
      <p className="display-md tabular-nums">
        <span ref={ref}>{formatted}</span>
        {suffix}
      </p>
      <p className="text-body-sm text-ink-muted">{label}</p>
    </div>
  );
}
