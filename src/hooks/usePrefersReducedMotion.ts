"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";

export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
