"use client";

import { useEffect, useRef, useState } from "react";
import SmartImage from "@/components/media/SmartImage";
import { isBrokenImage } from "@/lib/media";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");
}

/** A client portrait, or their initials when there is none or it fails to load. */
export default function ReviewAvatar({ src, name, size = "h-9 w-9" }: { src?: string; name: string; size?: string }) {
  const [failed, setFailed] = useState(false);
  const frame = useRef<HTMLSpanElement>(null);

  // The portrait is in the server HTML, so it can fail before React is
  // listening and that error is never replayed. Check what is already there.
  useEffect(() => {
    if (isBrokenImage(frame.current?.querySelector("img"))) setFailed(true);
  }, [src]);
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden border border-line bg-bg-raised-2 ${size}`}>
      {src && !failed ? (
        <span ref={frame} onErrorCapture={() => setFailed(true)} className="absolute inset-0">
          <SmartImage src={src} alt="" sizes="48px" />
        </span>
      ) : (
        <span aria-hidden="true" className="text-[0.6875rem] font-medium text-ink-muted">{initials(name)}</span>
      )}
    </span>
  );
}
