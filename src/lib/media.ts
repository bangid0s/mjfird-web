import { getYouTubeId, youTubeThumbnail } from "@/lib/youtube";

export function isYouTubeUrl(url: string) {
  return Boolean(getYouTubeId(url));
}

export function isVideoFile(url: string) {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
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

// Pasted addresses often arrive without a scheme ("example.com/pic.jpg");
// prefix https:// so they work in <img> and pass startsWith("http") checks.
export function normalizeMediaUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}
