import type { ReactElement } from "react";
import { shareHeadlineSize } from "@/lib/social-share";

// Shared artwork for every generated share thumbnail (the site card plus the
// per-project and per-post ones), so a link preview always looks like the site
// it came from. Rendered through next/og — only flexbox and a subset of CSS
// works here, hence the explicit `display: flex` on every box.

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#f5f1e8";
const INK_MUTED = "#9a9499";
const CANVAS = "#0c0b0d";

export type ShareCardOptions = {
  eyebrow: string;
  headline: string;
  host: string;
  accent: string;
  /** Data URL from `fetchImageData` — remote URLs are fetched up front so a dead link can't break the image. */
  background?: string | null;
  /** 0–100, how much the background is darkened so the type stays readable. */
  overlay?: number;
};

export function shareCard({
  eyebrow,
  headline,
  host,
  accent,
  background,
  overlay = 55,
}: ShareCardOptions): ReactElement {
  const title = headline.slice(0, 110);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: CANVAS,
        color: INK,
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      {background && (
        // next/image has no place inside an ImageResponse — satori renders raw tags.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={background}
          alt=""
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
      )}
      {background && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_SIZE.width,
            height: OG_SIZE.height,
            display: "flex",
            background: `rgba(12, 11, 13, ${Math.min(100, Math.max(0, overlay)) / 100})`,
          }}
        />
      )}

      <div style={{ display: "flex", width: 64, height: 10, background: accent }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {eyebrow && (
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {eyebrow.slice(0, 70)}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: shareHeadlineSize(title),
            fontWeight: 800,
            textTransform: "uppercase",
            lineHeight: 1.02,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          color: INK_MUTED,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {host}
      </div>
    </div>
  );
}

// next/og can load remote images itself, but a slow or broken URL would fail the
// whole response — and an OG route that 500s means no thumbnail at all. Fetching
// here means a bad background just gets dropped.
export async function fetchImageData(url: string | null | undefined): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/") || type.includes("svg")) return null;
    const buffer = await res.arrayBuffer();
    // 6MB of source art is already far more than a 1200×630 card needs.
    if (buffer.byteLength > 6_000_000) return null;
    return `data:${type};base64,${Buffer.from(buffer).toString("base64")}`;
  } catch {
    return null;
  }
}
