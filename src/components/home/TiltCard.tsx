"use client";

import { useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

/**
 * Leans its contents toward the pointer and moves a highlight across them,
 * like tilting a foil card. Mouse only, and off under reduced motion: the
 * styles in `globals.css` do nothing until this sets its properties.
 */
export default function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reducedMotion || e.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.dataset.tilting = "true";
    el.style.setProperty("--tilt-x", `${(0.5 - y) * 9}deg`);
    el.style.setProperty("--tilt-y", `${(x - 0.5) * 11}deg`);
    el.style.setProperty("--sheen-x", `${x * 100}%`);
    el.style.setProperty("--sheen-y", `${y * 100}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.tilting;
    el.style.removeProperty("--tilt-x");
    el.style.removeProperty("--tilt-y");
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={cn("tilt-card", className)}>
      {children}
      <span aria-hidden="true" className="tilt-sheen" />
    </div>
  );
}
