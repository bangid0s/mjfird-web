import { isVideoFile, isYouTubeUrl } from "@/lib/media";
import VideoEmbed from "@/components/media/VideoEmbed";
import Linkify from "@/components/ui/Linkify";
import { parseBodyBlocks } from "@/lib/blog-body";

// Body copy, with any paragraph that is just a media address promoted to a
// figure — see `parseBodyBlocks` for the shape the admin types.
export default function PostBody({ body }: { body: string[] }) {
  const blocks = parseBodyBlocks(body);

  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, i) =>
        block.type === "media" ? (
          <figure key={i} className="my-2 flex flex-col gap-3">
            {isYouTubeUrl(block.url) || isVideoFile(block.url) ? (
              <div className="relative aspect-video w-full overflow-hidden bg-bg-raised">
                <VideoEmbed url={block.url} title={block.caption} />
              </div>
            ) : (
              // Pasted addresses have unknown dimensions, so the image keeps
              // its own — an in-body illustration is never cropped.
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={block.url}
                alt={block.caption}
                loading="lazy"
                decoding="async"
                className="h-auto w-full bg-bg-raised"
              />
            )}
            {block.caption && (
              <figcaption className="font-mono text-label uppercase tracking-[0.1em] text-ink-faint">
                {block.caption}
              </figcaption>
            )}
          </figure>
        ) : (
          <p key={i} className="font-body text-body-lg leading-relaxed text-ink-muted">
            <Linkify text={block.text} />
          </p>
        ),
      )}
    </div>
  );
}
