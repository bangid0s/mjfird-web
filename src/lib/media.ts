import { getYouTubeId, youTubeThumbnail } from "@/lib/youtube";

export function isYouTubeUrl(url: string) {
  return Boolean(getYouTubeId(url));
}

export function isVideoFile(url: string) {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

export function isImageFile(url: string) {
  return /\.(jpe?g|png|gif|webp|avif|svg)(\?.*)?$/i.test(url);
}

/** True for anything we know how to render as media: image, video, or YouTube. */
export function isMediaUrl(url: string) {
  return isImageFile(url) || isVideoFile(url) || isYouTubeUrl(url);
}

// Only Supabase-hosted images go through next/image (it requires allowlisted
// hosts); arbitrary pasted URLs render as plain <img>.
export function isSupabaseHosted(url: string) {
  return /^https:\/\/[^/]+\.supabase\.co\//.test(url);
}

// Something safe to put in an <img> for any media URL: YouTube links resolve
// to their thumbnail, everything else is returned as-is.
export function mediaThumbnail(url: string) {
  const id = getYouTubeId(url);
  return id ? youTubeThumbnail(id) : url;
}

// Pull a usable URL out of a drag-and-drop payload. Dragging a link or some
// selected text (e.g. a YouTube URL from the address bar) lands here as
// text/uri-list or text/plain — grab the first http(s) address we can find.
export function urlFromDrop(dt: DataTransfer): string | null {
  const raw = dt.getData("text/uri-list") || dt.getData("text/plain");
  if (!raw) return null;
  const candidate = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
  if (!candidate) return null;
  const normalized = normalizeMediaUrl(candidate);
  return /^https?:\/\//i.test(normalized) ? normalized : null;
}

// Pasted addresses often arrive without a scheme ("example.com/pic.jpg");
// prefix https:// so they work in <img> and pass startsWith("http") checks.
export function normalizeMediaUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}
