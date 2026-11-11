"use client";

import HeroMedia from "@/components/hero/HeroMedia";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { getYouTubeId, youTubeThumbnail } from "@/lib/youtube";

type Props = {
  type: "image" | "video" | "youtube";
  url: string;
  overlayOpacity: number;
};

/**
 * The media behind the /links pane.
 *
 * A YouTube backdrop is only played where it can be seen and afforded: on a
 * phone the pane covers the whole screen, so the player would cost data and
 * battery to show nothing. There, and for visitors who asked for reduced
 * motion or data saving, the video's still frame stands in. The still also
 * sits under the player everywhere else, so the pane has a backdrop while the
 * player loads and if it never does.
 */
export default function LinksBackdrop({ type, url, overlayOpacity }: Props) {
  const wide = useMediaQuery("(min-width: 640px)");
  const reducedMotion = usePrefersReducedMotion();
  const saveData = useMediaQuery("(prefers-reduced-data: reduce)");
  const youTubeId = type === "youtube" || type === "video" ? getYouTubeId(url) : null;

  if (!youTubeId) return <HeroMedia type={type} url={url} overlayOpacity={overlayOpacity} />;

  const play = wide && !reducedMotion && !saveData;
  return (
    <>
      <HeroMedia type="image" url={youTubeThumbnail(youTubeId)} overlayOpacity={overlayOpacity} />
      {play && <HeroMedia type="youtube" url={url} overlayOpacity={overlayOpacity} />}
    </>
  );
}
