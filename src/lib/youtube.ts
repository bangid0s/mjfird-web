export function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? match[1] : null;
}

export function youTubeEmbedUrl(
  id: string,
  opts: { autoplay?: boolean; loop?: boolean; background?: boolean } = {},
) {
  const params = new URLSearchParams({
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });
  if (opts.autoplay) {
    params.set("autoplay", "1");
    params.set("mute", opts.background ? "1" : "0");
  }
  if (opts.loop) {
    params.set("loop", "1");
    params.set("playlist", id);
  }
  if (opts.background) {
    // Strip every bit of YouTube chrome so it reads as a clean video wall:
    // no controls, no play button, no title, no fullscreen, no captions.
    params.set("controls", "0");
    params.set("disablekb", "1");
    params.set("iv_load_policy", "3");
    params.set("fs", "0");
    params.set("showinfo", "0");
    params.set("cc_load_policy", "0");
    params.set("vq", "hd1080"); // best-effort high-quality hint
    params.set("mute", "1");
  }
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function youTubeThumbnail(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
