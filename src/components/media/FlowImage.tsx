import { getImageProps } from "next/image";
import { isOptimizable } from "@/lib/image-hosts";

// The largest width the optimizer is asked for. The real width is picked by
// the browser from `sizes`; this only has to be at least as big as that.
const MAX_WIDTH = 3840;

/**
 * An image that sizes itself from its own proportions — for masonry tiles,
 * lightboxes and covers whose dimensions aren't known up front, where
 * `next/image` (which needs width/height or `fill`) doesn't fit.
 *
 * Optimizable hosts still get a responsive AVIF/WebP `srcSet` from the image
 * optimizer; anything else falls back to the URL as-is.
 */
export default function FlowImage({
  src,
  alt = "",
  sizes = "100vw",
  className,
  style,
  priority = false,
}: {
  src: string;
  alt?: string;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Above the fold: load right away, ahead of other images. */
  priority?: boolean;
}) {
  const loading = priority ? "eager" : "lazy";
  const fetchPriority = priority ? "high" : undefined;

  if (!isOptimizable(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        className={className}
        style={style}
      />
    );
  }

  // Width/height here only feed the srcSet; they're dropped from the element
  // so the image keeps its natural aspect ratio.
  const { props } = getImageProps({ src, alt, width: MAX_WIDTH, height: MAX_WIDTH, sizes });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.src}
      srcSet={props.srcSet}
      sizes={props.sizes}
      alt={alt}
      decoding="async"
      loading={loading}
      fetchPriority={fetchPriority}
      className={className}
      style={style}
    />
  );
}
