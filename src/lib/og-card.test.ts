import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { ImageResponse } from "next/og";
import { OG_SIZE, shareCard, toPngDataUrl } from "@/lib/og-card";

/*
  next/og can't decode WebP: a .webp share background used to throw
  "u2 is not iterable" and fail the whole production build. Backgrounds in
  other formats are converted to PNG first.
*/

const card = (background: string | null) =>
  new ImageResponse(shareCard({ eyebrow: "x", headline: "MJFIRD", host: "mjfird.com", accent: "#ff8800", background }), { ...OG_SIZE });

test("a WebP background is converted to PNG and the card renders", async () => {
  const webp = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#884400" } }).webp().toBuffer();
  const raw = `data:image/webp;base64,${webp.toString("base64")}`;
  await assert.rejects(card(raw).arrayBuffer(), "next/og still can't draw WebP, so the conversion matters");

  const png = await toPngDataUrl(new Uint8Array(webp).buffer);
  assert.ok(png?.startsWith("data:image/png;base64,"));
  assert.ok((await card(png).arrayBuffer()).byteLength > 1000);
});

test("bytes that aren't an image give no background instead of an error", async () => {
  assert.equal(await toPngDataUrl(new TextEncoder().encode("not an image").buffer as ArrayBuffer), null);
  assert.ok((await card(null).arrayBuffer()).byteLength > 1000);
});
