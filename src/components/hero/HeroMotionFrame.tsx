"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { PRELOADER_SESSION_KEY, PRELOADER_DURATION } from "@/lib/preloader";

gsap.registerPlugin(ScrollTrigger);

/*
  Motion for the hero's media frame — the frame itself, not the artwork in it.
  The per-image loops (zoom / drift / pulse) still run inside; this sits one
  layer out and does three things, none of which paints over the image:

  1. Entrance. The frame opens as a wipe from the bottom edge, the same
     direction the wordmark letters rise, while the media inside settles from
     a slight overscale. Timed to land with the wordmark after the preloader.
  2. Scroll. As the hero leaves the viewport the media drifts up inside the
     frame at a slower rate than the page — depth, not movement for its own sake.
  3. Pointer. A few pixels of parallax, mirroring the wordmark's.

  The motion is applied to HeroMedia's media layer (marked `data-hero-media`),
  not to a wrapper around the whole component, so the slider's arrows and dots
  stay put while the artwork moves. The media is held at a small overscale
  throughout so none of the offsets can ever expose the frame's edge; the
  frame's own clip-path trims the overscale.
*/

const MEDIA_SELECTOR = "[data-hero-media]";

// Held for the whole life of the frame — headroom for the scroll and pointer
// offsets, so the panel's edge never shows through. 1.12 leaves 6% of the
// frame's height spare on each side, which has to cover SCROLL_TRAVEL plus
// POINTER_RANGE; keep that sum under it if either changes.
const OVERSCALE = 1.12;
// How far the media travels up inside the frame by the time the hero is gone.
const SCROLL_TRAVEL = 4; // yPercent
// Pointer parallax range, in pixels either side of centre.
const POINTER_RANGE = 10;

export default function HeroMotionFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // 1. Entrance wipe.
  useEffect(() => {
    const frame = frameRef.current;
    const media = frame?.querySelector<HTMLElement>(MEDIA_SELECTOR);
    if (!frame || !media) return;

    if (reducedMotion) {
      gsap.set(frame, { clipPath: "none" });
      gsap.set(media, { clearProps: "transform" });
      return;
    }

    const alreadySeen = sessionStorage.getItem(PRELOADER_SESSION_KEY);
    // A beat ahead of the wordmark, so the two read as one entrance.
    const delay = alreadySeen ? 0 : PRELOADER_DURATION - 0.45;

    const tl = gsap.timeline({ delay });
    tl.fromTo(
      frame,
      { clipPath: "inset(100% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "expo.inOut" },
    ).fromTo(
      media,
      { scale: OVERSCALE + 0.12 },
      { scale: OVERSCALE, duration: 1.6, ease: "expo.out" },
      "<0.15",
    );

    return () => {
      tl.kill();
    };
  }, [reducedMotion]);

  // 2. Scroll parallax.
  useEffect(() => {
    if (reducedMotion) return;
    const frame = frameRef.current;
    const media = frame?.querySelector<HTMLElement>(MEDIA_SELECTOR);
    if (!frame || !media) return;

    const tween = gsap.to(media, {
      yPercent: -SCROLL_TRAVEL,
      ease: "none",
      scrollTrigger: {
        trigger: frame,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [reducedMotion]);

  // 3. Pointer parallax, fine pointers only — on touch there's nothing to follow.
  useEffect(() => {
    if (reducedMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const frame = frameRef.current;
    const media = frame?.querySelector<HTMLElement>(MEDIA_SELECTOR);
    if (!frame || !media) return;

    const moveX = gsap.quickTo(media, "x", { duration: 0.9, ease: "power3.out" });
    const moveY = gsap.quickTo(media, "y", { duration: 0.9, ease: "power3.out" });

    // Listens on the whole hero, not just the frame: the image leans away from
    // the pointer wherever it is on the sheet.
    const section = frame.closest("section") ?? frame;

    const handleMove = (e: Event) => {
      const { clientX, clientY } = e as MouseEvent;
      const rect = section.getBoundingClientRect();
      const relX = (clientX - rect.left) / rect.width - 0.5;
      const relY = (clientY - rect.top) / rect.height - 0.5;
      moveX(-relX * POINTER_RANGE * 2);
      moveY(-relY * POINTER_RANGE * 2);
    };
    const handleLeave = () => {
      moveX(0);
      moveY(0);
    };

    section.addEventListener("mousemove", handleMove);
    section.addEventListener("mouseleave", handleLeave);
    return () => {
      section.removeEventListener("mousemove", handleMove);
      section.removeEventListener("mouseleave", handleLeave);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={frameRef}
      className={className}
      // Closed until the entrance runs, so the frame never flashes open first.
      // Reduced motion never runs the entrance, so it starts open.
      style={{ clipPath: reducedMotion ? undefined : "inset(100% 0% 0% 0%)" }}
    >
      {children}
    </div>
  );
}
