"use client";

import { useEffect, useRef, useState } from "react";
import { isBrokenImage } from "@/lib/media";

/**
 * A tool's icon, or its first two letters when there is no icon or the pasted
 * address stops resolving. Vendor icons are hotlinked from wherever the admin
 * found them, so a dead link has to degrade to something that still reads.
 */
export default function ToolIcon({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // The image is in the server HTML and can fail before React is listening;
  // that error is never replayed, so check what is already there.
  useEffect(() => {
    if (isBrokenImage(img.current)) setFailed(true);
  }, [src]);

  return (
    <span className="flex h-9 w-9 shrink-0 sm:h-10 sm:w-10 items-center justify-center border border-line bg-bg print:h-7 print:w-7">
      {src && !failed ? (
        /* Arbitrary pasted addresses: no next/image host allowlist to satisfy. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={img}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-5 w-5 object-contain sm:h-6 sm:w-6 print:h-4 print:w-4"
        />
      ) : (
        <span aria-hidden="true" className="font-mono text-label font-medium uppercase text-accent-strong">
          {name.slice(0, 2)}
        </span>
      )}
    </span>
  );
}
