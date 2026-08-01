import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/data/site-settings";
import { fetchImageData, shareCard, OG_SIZE } from "@/lib/og-card";
import { shareCardEyebrow, shareCardHeadline } from "@/lib/social-share";
import { SITE_HOST } from "@/lib/site-url";

// The site-wide link-preview thumbnail, drawn from the settings in
// /admin/settings → "Link preview". The <meta> tag is emitted by
// src/lib/social-share.ts (which also handles the "upload your own image" case),
// not by this file convention — see the note there.

export const size = OG_SIZE;
export const contentType = "image/png";

// Saving in the admin redraws this immediately (revalidatePath); the window is
// the safety net for settings edited straight in the Supabase dashboard, same as
// the public pages.
export const revalidate = 60;

export default async function OgImage() {
  const settings = await getSiteSettings();
  const background = await fetchImageData(settings.shareCardBgUrl);

  return new ImageResponse(
    shareCard({
      eyebrow: shareCardEyebrow(settings),
      headline: shareCardHeadline(settings),
      host: SITE_HOST,
      accent: settings.accentColor,
      background,
      overlay: settings.shareCardOverlayOpacity,
    }),
    { ...size },
  );
}
