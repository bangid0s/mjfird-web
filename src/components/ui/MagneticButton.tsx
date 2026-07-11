"use client";

import { useRef } from "react";
import gsap from "gsap";
import Link from "next/link";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import { useSound } from "@/lib/sound";

type Props = {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  cursorLabel?: "view" | "drag" | "play";
  type?: "button" | "submit";
};

const VARIANTS: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-accent text-accent-ink hover:bg-ink hover:text-bg",
  secondary: "border border-ink text-ink hover:border-accent hover:text-accent",
  ghost: "text-ink hover:text-accent",
};

export default function MagneticButton({
  href,
  onClick,
  children,
  variant = "primary",
  className,
  cursorLabel = "view",
  type = "button",
}: Props) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { playTick, playWhoosh } = useSound();

  const handleMove = (e: React.MouseEvent) => {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(ref.current, {
      x: x * 0.35,
      y: y * 0.35,
      duration: 0.38,
      ease: "cubic-bezier(0.65, 0, 0.35, 1)",
    });
  };

  const handleLeave = () => {
    if (!ref.current) return;
    gsap.to(ref.current, {
      x: 0,
      y: 0,
      duration: 0.68,
      ease: "cubic-bezier(0.16, 1, 0.3, 1)",
    });
  };

  const classes = cn(
    "inline-flex items-center justify-center gap-2 px-6 py-3 font-mono text-label uppercase tracking-[0.15em] transition-colors duration-[var(--duration-fast)]",
    VARIANTS[variant],
    className,
  );

  const sharedProps = {
    ref: ref as never,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    onMouseEnter: playTick,
    className: classes,
    "data-cursor": cursorLabel,
  };

  if (href) {
    return (
      <Link href={href} {...sharedProps} onClick={playWhoosh}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={() => {
        playWhoosh();
        onClick?.();
      }}
      {...sharedProps}
    >
      {children}
    </button>
  );
}
