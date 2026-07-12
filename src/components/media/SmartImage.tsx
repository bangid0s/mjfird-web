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
  priority,
}: {
  src: string;
  alt?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  const resolved = mediaThumbnail(src);

  if (isSupabaseHosted(resolved)) {
    return <Image src={resolved} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved} alt={alt} className={`absolute inset-0 h-full w-full ${className}`} />;
}
