import { ImageResponse } from "next/og";
import { getPost } from "@/lib/data/blog";
import { getSiteSettings } from "@/lib/data/site-settings";
import { fetchImageData, shareCard, OG_SIZE } from "@/lib/og-card";
import { SITE_HOST } from "@/lib/site-url";

// Fallback card for a post — used unless the post has its own share image set
// in the admin (see generateMetadata in page.tsx).

export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPost(slug), getSiteSettings()]);
  const background = await fetchImageData(settings.shareCardBgUrl);

  return new ImageResponse(
    shareCard({
      eyebrow: `${settings.logoText} — Notes`,
      headline: post?.title ?? settings.logoText,
      host: SITE_HOST,
      accent: settings.accentColor,
      background,
      overlay: settings.shareCardOverlayOpacity,
    }),
    { ...size },
  );
}
