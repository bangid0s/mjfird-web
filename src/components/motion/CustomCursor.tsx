"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type CursorState = "default" | "view" | "drag" | "play";

/*
  A cursor, not a billboard. The old version drew a ring with VIEW / DRAG /
  PLAY set inside it; the labels are the dated part, so what's left is a dot
  that tracks tightly and a ring that lags and swells over anything
  interactive.

  Both are painted white under `mix-blend-mode: difference`, which inverts
  whatever is beneath — so one cursor reads correctly on paper, on ink, and on
  top of artwork, with no theme branching.
*/

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CursorState>("default");
  const [visible, setVisible] = useState(false);
  const isTouch = useMediaQuery("(pointer: coarse)");

  useEffect(() => {
    if (isTouch) return;

    document.documentElement.setAttribute("data-cursor", "custom");

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    const moveDot = gsap.quickTo(dot, "x", { duration: 0.06, ease: "power3.out" });
    const moveDotY = gsap.quickTo(dot, "y", { duration: 0.06, ease: "power3.out" });
    const moveRing = gsap.quickTo(ring, "x", { duration: 0.42, ease: "power3.out" });
    const moveRingY = gsap.quickTo(ring, "y", { duration: 0.42, ease: "power3.out" });

    const handleMove = (e: MouseEvent) => {
      moveDot(e.clientX);
      moveDotY(e.clientY);
      moveRing(e.clientX);
      moveRingY(e.clientY);
      setVisible(true);
    };

    const handleOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("[data-cursor]");
      setState((target?.getAttribute("data-cursor") as CursorState) || "default");
    };

    // Leaving the document (or tabbing away) should take the cursor with it.
    const handleOut = (e: MouseEvent) => {
      if (!e.relatedTarget) setVisible(false);
    };
    const handleBlur = () => setVisible(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
      window.removeEventListener("blur", handleBlur);
      document.documentElement.removeAttribute("data-cursor");
    };
  }, [isTouch]);

  if (isTouch) return null;

  const active = state !== "default";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[var(--z-cursor)] mix-blend-difference"
      aria-hidden="true"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms linear" }}
    >
      <div
        ref={dotRef}
        className="fixed left-0 top-0 rounded-full bg-white transition-[width,height] duration-[var(--duration-base)] ease-[var(--ease-freeze)]"
        style={{
          width: active ? 4 : 7,
          height: active ? 4 : 7,
          marginLeft: active ? -2 : -3.5,
          marginTop: active ? -2 : -3.5,
        }}
      />
      <div
        ref={ringRef}
        className="fixed left-0 top-0 rounded-full border border-white transition-[width,height,margin,opacity] duration-[var(--duration-base)] ease-[var(--ease-freeze)]"
        style={{
          width: active ? 46 : 28,
          height: active ? 46 : 28,
          marginLeft: active ? -23 : -14,
          marginTop: active ? -23 : -14,
          opacity: active ? 1 : 0.55,
        }}
      />
    </div>
  );
}
