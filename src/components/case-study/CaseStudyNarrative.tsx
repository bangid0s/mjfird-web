import type { Project } from "@/lib/placeholder-data";
import Linkify from "@/components/ui/Linkify";
import VideoEmbed from "@/components/media/VideoEmbed";
import { isYouTubeUrl, isVideoFile, normalizeMediaUrl } from "@/lib/media";

// The narrative keys stay the same in the database; only the public labels are
// project-oriented now: brief → idea → execution → result.
export const NARRATIVE_SECTIONS: {
  key: keyof Project["narrative"];
  label: string;
}[] = [
  { key: "context", label: "The brief" },
  { key: "move", label: "The idea" },
  { key: "build", label: "The execution" },
  { key: "result", label: "The result" },
];

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
const TRAILING = /[.,;:!?)\]}'"»”]+$/;

// A YouTube link (or direct video file) pasted into a narrative section should
// play as an embedded video rather than sit there as a bare link. Pull those
// URLs out of the prose so the text renders cleanly and the videos render as
// players below it; every other link is left for Linkify to handle.
function splitVideos(text: string): { prose: string; videos: string[] } {
  const videos: string[] = [];
  const prose = text.replace(URL_PATTERN, (raw) => {
    const trailingMatch = raw.match(TRAILING);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const token = trailing ? raw.slice(0, raw.length - trailing.length) : raw;
    const url = normalizeMediaUrl(token);
    if (isYouTubeUrl(url) || isVideoFile(url)) {
      videos.push(url);
      return trailing; // drop the URL itself, keep any trailing punctuation
    }
    return raw;
  });
  // Tidy up whitespace/blank lines left where a URL used to be.
  const tidied = prose
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { prose: tidied, videos };
}

export default function CaseStudyNarrative({
  narrative,
  className,
}: {
  narrative: Project["narrative"];
  className?: string;
}) {
  const sections = NARRATIVE_SECTIONS.filter(({ key }) => narrative[key]?.trim());
  if (sections.length === 0) return null;

  return (
    <div className={className ?? "flex flex-col gap-12"}>
      {sections.map(({ key, label }) => {
        const { prose, videos } = splitVideos(narrative[key]!);
        return (
          <section key={key} className="flex flex-col gap-3">
            <p className="font-mono text-label uppercase tracking-[0.2em] text-accent">{label}</p>
            {prose && (
              <p className="max-w-2xl font-body text-body-lg leading-relaxed text-ink">
                <Linkify text={prose} />
              </p>
            )}
            {videos.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="relative aspect-video w-full max-w-2xl overflow-hidden border border-line bg-bg-raised"
              >
                <VideoEmbed url={url} title={label} />
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
