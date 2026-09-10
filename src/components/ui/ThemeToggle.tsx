"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { applyChoice, THEME_ORDER, type ThemeChoice } from "@/lib/theme";

/*
  Cycles system → light → dark → system. "System" is the default and the
  resting state, so the icon has to be able to say so — hence three icons
  rather than a two-way switch.
*/

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", callback);
  };
}

// The pre-paint script already stamped any explicit choice onto <html>, so the
// attribute is the source of truth and storage doesn't need re-reading.
function getSnapshot(): ThemeChoice {
  const attr = document.documentElement.dataset.theme;
  return attr === "light" || attr === "dark" ? attr : "system";
}

const LABELS: Record<ThemeChoice, string> = {
  system: "Theme: following your system. Switch to light",
  light: "Theme: light. Switch to dark",
  dark: "Theme: dark. Follow your system",
};

export default function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribe, getSnapshot, () => "system" as const);

  const advance = () => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(choice) + 1) % THEME_ORDER.length];
    applyChoice(next);
  };

  return (
    <button
      type="button"
      onClick={advance}
      aria-label={LABELS[choice]}
      title={LABELS[choice]}
      data-cursor="view"
      className={cn(
        className ??
          "flex h-9 w-9 items-center justify-center text-ink-muted transition-colors duration-[var(--duration-fast)] hover:bg-bg-raised-2 hover:text-ink",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[18px] w-[18px]"
        aria-hidden="true"
      >
        {choice === "system" && (
          // Monitor — following the OS
          <>
            <rect x="2.5" y="4" width="19" height="13" rx="2" />
            <path d="M8.5 20.5h7M12 17v3.5" />
          </>
        )}
        {choice === "light" && (
          // Sun
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        )}
        {choice === "dark" && (
          // Moon
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
    </button>
  );
}
