/*
  Shrink big reference photos in the browser before they upload. A phone photo
  is often 4–8 MB at 4000px+; for a reference, 2560px on the long edge looks
  the same and is a fraction of the size. Re-encoding also drops EXIF data,
  including GPS location, which clients rarely mean to share.

  Only JPEG, PNG and WebP are touched. GIFs (may be animated), PDFs, PSDs and
  anything else upload as they are. Any failure falls back to the original
  file, so a quirky browser never blocks an upload.
*/

export const MAX_EDGE = 2560;
/** Below this, a file that's already small enough in pixels is left alone. */
export const SMALL_BYTES = 1.5 * 1024 * 1024;
export const QUALITY = 0.88;

const RESIZABLE = ["image/jpeg", "image/png", "image/webp"] as const;
type Resizable = (typeof RESIZABLE)[number];

export function isResizable(type: string): type is Resizable {
  return (RESIZABLE as readonly string[]).includes(type);
}

/** Fit inside maxEdge × maxEdge, keeping the aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height, scaled: false };
  const k = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)), scaled: true };
}

/**
 * JPEG stays JPEG. PNG and WebP go to WebP, which keeps transparency and is far
 * smaller than PNG for photos and painted art.
 */
export function outputType(input: Resizable): "image/jpeg" | "image/webp" {
  return input === "image/jpeg" ? "image/jpeg" : "image/webp";
}

export function renameForType(name: string, type: string) {
  const ext = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : type === "image/png" ? "png" : null;
  if (!ext) return name;
  const dot = name.lastIndexOf(".");
  return `${dot > 0 ? name.slice(0, dot) : name}.${ext}`;
}

/** Keep the new file only when it's actually smaller. */
export function keepShrunk(original: number, shrunk: number) {
  return shrunk > 0 && shrunk < original;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function shrinkImage(file: File): Promise<File> {
  if (!isResizable(file.type) || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const size = fitWithin(bitmap.width, bitmap.height);
    if (!size.scaled && file.size <= SMALL_BYTES) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();

    let type: string = outputType(file.type);
    const blob = await toBlob(canvas, type, QUALITY);
    // Older Safari can't encode WebP and quietly hands back a PNG instead.
    if (blob && blob.type !== type) {
      type = blob.type || "image/png";
    }
    if (!blob || !keepShrunk(file.size, blob.size)) return file;
    return new File([blob], renameForType(file.name, type), { type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}
