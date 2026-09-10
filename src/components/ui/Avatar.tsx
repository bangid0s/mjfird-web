import { cn } from "@/lib/cn";
import SmartImage from "@/components/media/SmartImage";

// Portrait on a brand-accent field. The background follows the site accent
// colour, so it restyles with the brand.
//
// `fit` picks how the image meets the frame:
// - "contain" (default) pins it to the bottom edge uncropped, so a cut-out PNG
//   stands on the base of the frame instead of being sliced through the middle.
// - "cover" fills the frame, cropping the overflow — for ordinary photographs,
//   where leaving the accent field showing round the edges reads as a gap.
export default function Avatar({
  src,
  alt,
  className,
  fit = "contain",
  sizes = "(min-width: 640px) 40vw, 100vw",
}: {
  src: string;
  alt: string;
  className?: string;
  fit?: "contain" | "cover";
  sizes?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[var(--radius-xl)] bg-accent", className)}>
      <SmartImage
        src={src}
        alt={alt}
        sizes={sizes}
        className={fit === "cover" ? "object-cover object-center" : "object-contain object-bottom"}
      />
    </div>
  );
}
