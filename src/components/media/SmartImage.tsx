import Image from "next/image";
import { isSupabaseHosted, mediaThumbnail } from "@/lib/media";

// Fill-mode image that works with any URL: Supabase uploads get next/image
// optimization, arbitrary pasted URLs render as a plain <img>, and YouTube
// links fall back to their thumbnail frame.
export default function SmartImage({
  src,
  alt = "",
  sizes = "100vw",
  className = "object-cover",
  style,
  priority,
  lazy = false,
}: {
  src: string;
  alt?: string;
  sizes?: string;
  className?: string;
  /** Mostly for `objectPosition` — see `CoverMedia`'s focal point. */
  style?: React.CSSProperties;
  priority?: boolean;
  /** Plain images only: defer loading until the image nears the viewport. */
  lazy?: boolean;
}) {
  const resolved = mediaThumbnail(src);

  if (isSupabaseHosted(resolved)) {
    return (
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
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
      style={style}
      loading={lazy && !priority ? "lazy" : undefined}
      decoding={lazy ? "async" : undefined}
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
