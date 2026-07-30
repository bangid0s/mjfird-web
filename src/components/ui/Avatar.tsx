import { cn } from "@/lib/cn";
import SmartImage from "@/components/media/SmartImage";

// Portrait on a brand-accent field. The image is contained rather than cropped
// and pinned to the bottom edge, so a cut-out PNG stands on the base of the
// frame instead of being sliced through the middle. The background follows the
// site accent colour, so it restyles with the brand.
export default function Avatar({
  src,
  alt,
  className,
  sizes = "(min-width: 640px) 40vw, 100vw",
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-accent", className)}>
      <SmartImage src={src} alt={alt} sizes={sizes} className="object-contain object-bottom" />
    </div>
  );
}
