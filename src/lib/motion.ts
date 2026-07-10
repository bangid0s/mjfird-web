// JS mirror of the CSS motion tokens in globals.css — GSAP/Framer need values,
// not custom properties, so keep these two in sync by hand.
export const duration = {
  fast: 0.18,
  base: 0.38,
  expressive: 0.68,
} as const;

export const durationMs = {
  fast: 180,
  base: 380,
  expressive: 680,
} as const;

// cubic-bezier(0.16, 1, 0.3, 1) — snap-then-settle, like landing a freeze
export const easeFreeze = [0.16, 1, 0.3, 1] as const;
// cubic-bezier(0.65, 0, 0.35, 1) — toprock sway, hover/quick response
export const easeSwing = [0.65, 0, 0.35, 1] as const;

export const easeFreezeCss = "cubic-bezier(0.16, 1, 0.3, 1)";
export const easeSwingCss = "cubic-bezier(0.65, 0, 0.35, 1)";
