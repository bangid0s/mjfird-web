"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Backs out of a standalone page to the main site, so the ESC hint in the
// window's status bar is true. /links has the same binding inside LinksTabs.
export default function EscapeToHome() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}
