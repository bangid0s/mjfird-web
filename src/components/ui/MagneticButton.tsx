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
  size?: "md" | "lg";
  /** Trailing arrow that slides on hover. Opt in for real calls to action. */
  arrow?: boolean;
  className?: string;
  cursorLabel?: "view" | "drag" | "play";
  type?: "button" | "submit";
};

const VARIANTS: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  secondary: "border border-ink text-ink hover:bg-ink hover:text-bg",
  ghost: "text-ink-muted hover:text-ink",
};

const SIZES: Record<NonNullable<Props["size"]>, string> = {
  md: "px-5 py-3",
  lg: "px-7 py-4",
};

export default function MagneticButton({
  href,
  onClick,
  children,
  variant = "primary",
  size = "md",
  arrow = false,
  className,
  cursorLabel = "view",
  type = "button",
}: Props) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { playTick, playWhoosh } = useSound();

  // Softer pull than before — enough to feel alive, not enough to make the
  // button feel like it's dodging the pointer.
  const handleMove = (e: React.MouseEvent) => {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(ref.current, {
      x: x * 0.18,
      y: y * 0.18,
      duration: 0.4,
      ease: "power3.out",
    });
  };

  const handleLeave = () => {
    if (!ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.6)" });
  };

  const classes = cn(
    "spec group inline-flex items-center justify-center gap-2.5 transition-[background-color,border-color,color,filter] duration-[var(--duration-fast)] ease-[var(--ease-swing)]",
    SIZES[size],
    VARIANTS[variant],
    className,
  );

  const content = (
    <>
      {children}
      {arrow && (
        <span
          aria-hidden="true"
          className="transition-transform duration-[var(--duration-base)] ease-[var(--ease-freeze)] group-hover:translate-x-1"
        >
          →
        </span>
      )}
    </>
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
    // Some hrefs are admin-editable now, so an absolute URL can turn up here.
    // Send those off-site in a new tab, and safely.
    const external = /^https?:\/\//i.test(href);
    return (
      <Link
        href={href}
        {...sharedProps}
        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
        onClick={playWhoosh}
      >
        {content}
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
      {content}
    </button>
  );
}
