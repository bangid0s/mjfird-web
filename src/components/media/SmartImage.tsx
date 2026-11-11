import Image from "next/image";
import { mediaThumbnail } from "@/lib/media";
import { isOptimizable } from "@/lib/image-hosts";

// Fill-mode image that works with any URL: images from known hosts (Supabase,
// Behance, DeviantArt… see image-hosts.ts) get next/image optimization, other
// pasted URLs render as a plain <img>, and YouTube links fall back to their
// thumbnail frame.
export default function SmartImage({
  src,
  alt = "",
  sizes = "100vw",
  className = "object-cover",
  style,
  priority,
}: {
  src: string;
  alt?: string;
  sizes?: string;
  className?: string;
  /** Mostly for `objectPosition` — see `CoverMedia`'s focal point. */
  style?: React.CSSProperties;
  priority?: boolean;
}) {
  const resolved = mediaThumbnail(src);

  if (isOptimizable(resolved)) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        preload={priority}
        className={className}
        style={style}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      style={style}
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
