"use client";

import { useEffect, useRef } from "react";
import { trackEvent, type TrackEvent, type TrackParams } from "@/lib/track";

/**
 * Sends one event when the page that renders it is shown. With `dropParam`,
 * that query parameter is removed afterwards, so a refresh doesn't count the
 * same request twice (e.g. ?submitted=1 after sending a request).
 */
export default function TrackOnView({
  event,
  params,
  dropParam,
}: {
  event: TrackEvent;
  params?: TrackParams;
  dropParam?: string;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackEvent(event, params);
    if (dropParam) {
      const url = new URL(window.location.href);
      if (url.searchParams.has(dropParam)) {
        url.searchParams.delete(dropParam);
        window.history.replaceState(window.history.state, "", url);
      }
    }
  }, [event, params, dropParam]);
  return null;
}
