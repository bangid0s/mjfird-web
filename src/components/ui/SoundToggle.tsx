"use client";

import { useSound } from "@/lib/sound";

export default function SoundToggle() {
  const { enabled, toggle } = useSound();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute UI sound" : "Unmute UI sound"}
      data-cursor="view"
      className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint transition-colors hover:text-ink"
    >
      Sound {enabled ? "on" : "off"}
    </button>
  );
}
