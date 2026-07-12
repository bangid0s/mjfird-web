import { cn } from "@/lib/cn";
import { isYouTubeUrl, isVideoFile } from "@/lib/media";
import VideoEmbed from "@/components/media/VideoEmbed";
import SmartImage from "@/components/media/SmartImage";

// A template media slot: renders the gallery entry for this position —
// uploaded image, pasted image URL, video file, or YouTube link (embedded,
// click-to-play) — otherwise the placeholder gradient the templates shipped with.
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
    if (isYouTubeUrl(image.url) || isVideoFile(image.url)) {
      return (
        <div className={cn("relative overflow-hidden", className)}>
          <VideoEmbed url={image.url} title={image.alt} />
        </div>
      );
    }
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <SmartImage src={image.url} alt={image.alt ?? ""} sizes={sizes} />
      </div>
    );
  }
  return <div className={cn("bg-gradient-to-br from-bg-raised to-bg-raised-2", className)} />;
}
