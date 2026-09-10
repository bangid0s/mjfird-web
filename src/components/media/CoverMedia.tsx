import { cn } from "@/lib/cn";
import { isVideoFile, isYouTubeUrl } from "@/lib/media";
import SmartImage from "@/components/media/SmartImage";
import VideoEmbed from "@/components/media/VideoEmbed";
import type { CoverFit } from "@/lib/supabase/types";

const OBJECT_FIT: Record<Exclude<CoverFit, "natural">, string> = {
  cover: "object-cover",
  contain: "object-contain",
  stretch: "object-fill",
};

function PlayGlyph() {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-accent pl-0.5 text-accent-ink">
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}

/**
 * A cover image (or video) rendered the way the admin asked for it:
 *
 * - `cover`   — fills the frame and crops the overflow, keeping `focalPoint`
 *               in view, so a portrait cover loses its edges rather than its
 *               subject
 * - `contain` — the whole image inside the frame, letterboxed
 * - `natural` — no frame: the cover keeps its own proportions, which is what a
 *               portrait or a tall comic panel usually wants
 * - `stretch` — fills the frame regardless of proportions
 *
 * `natural` reserves the right box up front when `aspect` (width ÷ height,
 * measured in the admin) is known, and otherwise lets the image size itself.
 * Videos and YouTube links have no proportions of their own here, so they stay
 * in a 16:9 frame whatever the fit says.
 */
export default function CoverMedia({
  src,
  alt = "",
  fit = "cover",
  focalPoint,
  aspect = 0,
  ratio = "16 / 10",
  maxHeight,
  sizes = "100vw",
  className,
  mediaClassName,
  priority,
  interactive = false,
}: {
  src: string;
  alt?: string;
  fit?: CoverFit;
  focalPoint?: { x: number; y: number };
  aspect?: number;
  /** The frame's shape for every fit but `natural`. */
  ratio?: string;
  /** Ceiling for `natural`, so an extreme panorama can't take over the page. */
  maxHeight?: string;
  sizes?: string;
  className?: string;
  mediaClassName?: string;
  priority?: boolean;
  /** Play videos in place instead of showing a still frame. */
  interactive?: boolean;
}) {
  const playable = isYouTubeUrl(src) || isVideoFile(src);
  const frame = cn("relative w-full overflow-hidden bg-bg-raised", className);

  if (playable) {
    const playerRatio = fit === "natural" ? "16 / 9" : ratio;

    if (interactive) {
      return (
        <div className={frame} style={{ aspectRatio: playerRatio }}>
          <VideoEmbed url={src} title={alt} />
        </div>
      );
    }

    // A still frame — the card around it is already a link, so nothing here
    // should swallow the click.
    return (
      <div className={frame} style={{ aspectRatio: playerRatio }}>
        {isVideoFile(src) ? (
          <video
            src={src}
            muted
            playsInline
            preload="metadata"
            className={cn("pointer-events-none absolute inset-0 h-full w-full object-cover", mediaClassName)}
          />
        ) : (
          <SmartImage
            src={src}
            alt={alt}
            sizes={sizes}
            priority={priority}
            className={cn("object-cover", mediaClassName)}
          />
        )}
        <PlayGlyph />
      </div>
    );
  }

  if (fit === "natural") {
    if (aspect > 0) {
      // Capping the width rather than the height keeps the frame in proportion
      // as it shrinks, so nothing is letterboxed on the way down.
      return (
        <div
          className="mx-auto w-full"
          style={maxHeight ? { maxWidth: `calc(${maxHeight} * ${aspect})` } : undefined}
        >
          <div className={frame} style={{ aspectRatio: aspect }}>
            <SmartImage
              src={src}
              alt={alt}
              sizes={sizes}
              priority={priority}
              className={cn("object-contain", mediaClassName)}
            />
          </div>
        </div>
      );
    }

    // No measurement to go on — posts written before the admin started taking
    // one. The image sets its own height, and `object-contain` only comes into
    // play if `maxHeight` has to rein it in.
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        style={maxHeight ? { maxHeight } : undefined}
        className={cn("mx-auto block h-auto w-full object-contain", className, mediaClassName)}
      />
    );
  }

  return (
    <div className={frame} style={{ aspectRatio: ratio }}>
      <SmartImage
        src={src}
        alt={alt}
        sizes={sizes}
        priority={priority}
        className={cn(OBJECT_FIT[fit], mediaClassName)}
        style={
          fit === "cover" && focalPoint
            ? { objectPosition: `${focalPoint.x * 100}% ${focalPoint.y * 100}%` }
            : undefined
        }
      />
    </div>
  );
}
