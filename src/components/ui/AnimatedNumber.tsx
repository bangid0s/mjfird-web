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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reducedMotion) {
      el.textContent = value.toLocaleString("en-US");
      return;
    }

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
    };
  }, [value, reducedMotion]);

  return (
    <div className="flex flex-col gap-2.5">
      <p className="display-md tabular-nums">
        <span ref={ref}>0</span>
        {suffix}
      </p>
      <p className="text-body-sm text-ink-muted">{label}</p>
    </div>
  );
}
