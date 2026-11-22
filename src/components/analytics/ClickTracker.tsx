"use client";

import { useEffect } from "react";
import { trackEvent, type TrackEvent } from "@/lib/track";

const KNOWN: TrackEvent[] = ["view_item", "begin_checkout", "generate_lead", "purchase", "select_item", "join_waitlist"];

/**
 * One listener for the whole site: any element marked
 * data-track="select_item" (plus data-track-* params) reports its clicks.
 * Lets server-rendered pages track a button without becoming client code.
 */
export default function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-track]");
      if (!(el instanceof HTMLElement)) return;
      const name = el.dataset.track as TrackEvent;
      if (!KNOWN.includes(name)) return;
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(el.dataset)) {
        if (key.startsWith("track") && key !== "track" && value) {
          params[key.slice(5).replace(/^./, (c) => c.toLowerCase()).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = value;
        }
      }
      trackEvent(name, params);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
