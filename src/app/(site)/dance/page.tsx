import type { Metadata } from "next";
import SmartImage from "@/components/media/SmartImage";
import SectionHeader from "@/components/ui/SectionHeader";
import VideoEmbed from "@/components/media/VideoEmbed";
import { getDanceMedia, getBattles } from "@/lib/data/dance";
import { getSiteSettings } from "@/lib/data/site-settings";

export const metadata: Metadata = {
  title: "Dance",
  description: "MJFIRD's breaking reel, stills, and battle history.",
};

export default async function DancePage() {
  const [media, battles, settings] = await Promise.all([
    getDanceMedia(),
    getBattles(),
    getSiteSettings(),
  ]);
  const stills = media.filter((m) => m.kind === "photo");
  const videos = media.filter((m) => m.kind === "video" && m.url);
  const [featured, ...moreVideos] = videos;

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <SectionHeader
          eyebrow={settings.danceSectionEyebrow}
          title={settings.danceSectionTitle}
        />
        <p className="max-w-xl font-body text-body-lg text-ink-muted">{settings.danceIntro}</p>
      </div>

      {/* Featured reel */}
      <div className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
        {featured ? (
          <figure>
            <div className="aspect-video w-full overflow-hidden bg-bg-raised">
              <VideoEmbed url={featured.url} title={featured.caption || "Reel"} />
            </div>
            {featured.caption && (
              <figcaption className="mt-3 font-mono text-label uppercase tracking-[0.15em] text-ink-muted">
                {featured.caption}
              </figcaption>
            )}
          </figure>
        ) : (
          <div
            data-cursor="play"
            className="flex aspect-video w-full items-center justify-center bg-bg-raised"
          >
            <span className="px-6 text-center font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
              Add a video in Admin → Dance (YouTube link works) and it lands here
            </span>
          </div>
        )}
      </div>

      {/* More footage */}
      {moreVideos.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
          <h2 className="mb-6 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
            More footage
          </h2>
          <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {moreVideos.map((video, i) => (
              <figure key={`${video.url}-${i}`}>
                <div className="aspect-video w-full overflow-hidden bg-bg-raised">
                  <VideoEmbed url={video.url} title={video.caption} />
                </div>
                {video.caption && (
                  <figcaption className="mt-2 truncate font-mono text-label uppercase tracking-[0.1em] text-ink-muted">
                    {video.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      )}

      {/* Stills */}
      {stills.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pb-20 sm:px-10">
          <h2 className="mb-6 font-mono text-label uppercase tracking-[0.2em] text-ink-faint">
            Stills
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stills.map((still, i) =>
              still.url ? (
                <div key={i} className="relative aspect-square w-full overflow-hidden" data-cursor="view">
                  <SmartImage
                    src={still.url}
                    alt={still.caption}
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] hover:scale-[1.03]"
                  />
                </div>
              ) : (
                <div
                  key={i}
                  data-cursor="view"
                  className="aspect-square bg-gradient-to-br from-bg-raised to-bg-raised-2 transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] hover:scale-[1.03]"
                />
              ),
            )}
          </div>
        </div>
      )}

      <div className="border-t border-line bg-bg-raised">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
          <SectionHeader eyebrow="Battle Record" title="On the record" />
          <table className="w-full border-collapse">
            <tbody>
              {battles.map((b) => (
                <tr key={`${b.year}-${b.event}`} className="border-t border-line">
                  <td className="py-4 font-mono text-body-sm text-ink-muted">{b.year}</td>
                  <td className="py-4 font-body text-body text-ink">{b.event}</td>
                  <td className="py-4 text-right font-mono text-body-sm text-accent">{b.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
