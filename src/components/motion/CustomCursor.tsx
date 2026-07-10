"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type CursorState = "default" | "view" | "drag" | "play";

const LABELS: Record<Exclude<CursorState, "default">, string> = {
  view: "VIEW",
  drag: "DRAG",
  play: "PLAY",
};

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CursorState>("default");
  const isTouch = useMediaQuery("(pointer: coarse)");
  const enabled = !isTouch;

  useEffect(() => {
    if (isTouch) return;

    document.documentElement.setAttribute("data-cursor", "custom");

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const moveDot = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power3.out" });
    const moveDotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power3.out" });
    const moveRing = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3.out" });
    const moveRingY = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3.out" });

    const handleMove = (e: MouseEvent) => {
      moveDot(e.clientX);
      moveDotY(e.clientY);
      moveRing(e.clientX);
      moveRingY(e.clientY);
    };

    const handleOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("[data-cursor]");
      const next = (target?.getAttribute("data-cursor") as CursorState) || "default";
      setState(next);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseover", handleOver);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseover", handleOver);
      document.documentElement.removeAttribute("data-cursor");
    };
  }, [isTouch]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[var(--z-cursor)]" aria-hidden="true">
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
      />
      <div
        ref={ringRef}
        data-state={state}
        className="fixed left-0 top-0 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink/40 transition-[width,height,border-color] duration-[var(--duration-base)] ease-[var(--ease-freeze)] data-[state=view]:h-16 data-[state=view]:w-16 data-[state=view]:border-accent data-[state=drag]:h-16 data-[state=drag]:w-16 data-[state=drag]:border-accent data-[state=play]:h-16 data-[state=play]:w-16 data-[state=play]:border-accent"
      >
        {state !== "default" && (
          <span className="font-mono text-[9px] tracking-[0.15em] text-accent">
            {LABELS[state]}
          </span>
        )}
      </div>
    </div>
  );
}
