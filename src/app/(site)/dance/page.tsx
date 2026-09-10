import type { Metadata } from "next";
import SmartImage from "@/components/media/SmartImage";
import SectionHeader from "@/components/ui/SectionHeader";
import VideoEmbed from "@/components/media/VideoEmbed";
import Reveal from "@/components/motion/Reveal";
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
  // Battle record runs newest year first. Ties keep their saved sort_order
  // (Array.prototype.sort is stable), so admins still control same-year ordering.
  const orderedBattles = [...battles].sort(
    (a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0),
  );

  return (
    <div>
      <div className="container-page pb-12 pt-14 sm:pt-20">
        <SectionHeader
          eyebrow={settings.danceSectionEyebrow}
          title={settings.danceSectionTitle}
          description={settings.danceIntro}
        />
      </div>

      {/* Featured reel */}
      <Reveal className="container-page pb-16">
        {featured ? (
          <figure>
            <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bg-raised-2">
              <VideoEmbed url={featured.url} title={featured.caption || "Reel"} />
            </div>
            {featured.caption && (
              <figcaption className="meta mt-3">{featured.caption}</figcaption>
            )}
          </figure>
        ) : (
          <div
            data-cursor="play"
            className="flex aspect-video w-full items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-line bg-bg-raised/50"
          >
            <span className="max-w-sm px-6 text-center text-body-sm text-ink-faint">
              Add a video in Admin → Dance (YouTube link works) and it lands here
            </span>
          </div>
        )}
      </Reveal>

      {/* More footage */}
      {moreVideos.length > 0 && (
        <div className="container-page pb-16">
          <h2 className="eyebrow mb-6">More footage</h2>
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {moreVideos.map((video, i) => (
              <Reveal as="figure" key={`${video.url}-${i}`} delay={(i % 3) * 60}>
                <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-md)] border border-line bg-bg-raised-2">
                  <VideoEmbed url={video.url} title={video.caption} />
                </div>
                {video.caption && (
                  <figcaption className="meta mt-2.5 truncate">{video.caption}</figcaption>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      )}

      {/* Stills */}
      {stills.length > 0 && (
        <div className="container-page pb-[var(--space-section)]">
          <h2 className="eyebrow mb-6">Stills</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stills.map((still, i) => (
              <Reveal
                key={i}
                delay={(i % 4) * 50}
                className="group relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border border-line bg-bg-raised-2"
              >
                {still.url ? (
                  <SmartImage
                    src={still.url}
                    alt={still.caption}
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="object-cover transition-transform duration-[var(--duration-expressive)] ease-[var(--ease-freeze)] group-hover:scale-[1.05]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-bg-raised to-bg-raised-2" />
                )}
              </Reveal>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-line bg-bg-raised/60">
        <div className="container-page py-[var(--space-section)]">
          <SectionHeader eyebrow="Battle Record" title="On the record" />
          <table className="w-full border-collapse">
            <tbody>
              {orderedBattles.map((b) => (
                <tr
                  key={`${b.year}-${b.event}`}
                  className="border-t border-line last:border-b"
                >
                  <td className="py-4 pr-4 align-top">
                    <span className="mono-meta">{b.year}</span>
                  </td>
                  <td className="py-4 pr-4 text-body text-ink">{b.event}</td>
                  <td className="py-4 text-right">
                    <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-body-sm font-medium text-accent">
                      {b.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
