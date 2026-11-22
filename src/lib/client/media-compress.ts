/*
  Admin uploads to the public `media` bucket are squeezed in the browser to
  the shared budget (≤300 KB, ≤2400px, WebP) before they leave the machine.
  See src/lib/media-budget.ts for the size search.

  Only JPEG, PNG and WebP are touched; GIFs (may be animated), SVGs, videos
  and anything else upload as they are. A file already within budget is left
  alone. Browsers that can't encode WebP (older Safari) get JPEG instead, unless
  the image has transparency, in which case the original is kept so it never
  turns black. Any failure falls back to the original file.
*/

import { fitToBudget, MEDIA_MAX_BYTES, MEDIA_MAX_EDGE } from "@/lib/media-budget";
import { fitWithin, renameForType } from "@/lib/client/shrink-image";

const COMPRESSIBLE = ["image/jpeg", "image/png", "image/webp"];

let webpSupport: boolean | null = null;
function canEncodeWebp() {
  if (webpSupport === null) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webpSupport;
}

function hasAlpha(bitmap: ImageBitmap) {
  const size = fitWithin(bitmap.width, bitmap.height, 512);
  const c = document.createElement("canvas");
  c.width = size.width;
  c.height = size.height;
  const ctx = c.getContext("2d");
  if (!ctx) return true;
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  const data = ctx.getImageData(0, 0, size.width, size.height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

function encode(bitmap: ImageBitmap, edge: number, type: string, quality: number) {
  const size = fitWithin(bitmap.width, bitmap.height, edge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("no canvas"));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), type, quality / 100),
  );
}

export async function compressForMedia(file: File): Promise<File> {
  if (!COMPRESSIBLE.includes(file.type) || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (file.size <= MEDIA_MAX_BYTES && longEdge <= MEDIA_MAX_EDGE) return file;

    const type = canEncodeWebp()
      ? "image/webp"
      : file.type === "image/jpeg" || !hasAlpha(bitmap)
        ? "image/jpeg"
        : null;
    if (!type) return file;

    const bmp = bitmap;
    const { out } = await fitToBudget(longEdge, ({ edge, quality }) => encode(bmp, edge, type, quality));
    if (out.size >= file.size && longEdge <= MEDIA_MAX_EDGE) return file;
    return new File([out], renameForType(file.name, type), { type, lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
