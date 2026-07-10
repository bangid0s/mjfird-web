import Image from "next/image";
import { cn } from "@/lib/cn";

// A template image slot: renders the gallery image if one exists for this
// position, otherwise the placeholder gradient block the templates shipped with.
export default function MediaSlot({
  image,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
}: {
  image?: { url: string; alt?: string };
  className?: string;
  sizes?: string;
}) {
  if (image?.url) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image src={image.url} alt={image.alt ?? ""} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  return <div className={cn("bg-gradient-to-br from-bg-raised to-bg-raised-2", className)} />;
}
