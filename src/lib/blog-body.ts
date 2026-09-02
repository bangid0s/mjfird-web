import { isMediaUrl, normalizeMediaUrl } from "@/lib/media";

export type BodyBlock =
  | { type: "text"; text: string }
  | { type: "media"; url: string; caption: string };

/**
 * Blog bodies are stored as an array of paragraphs (the admin splits the
 * textarea on blank lines). A paragraph whose first line is nothing but a
 * media address — an image, a video file, or a YouTube link — becomes a media
 * block instead of a paragraph, and anything on the lines below it is that
 * block's caption:
 *
 *     https://…/process-sheet.jpg
 *     Thumbnails before the linework goes in.
 *
 * A link written inside a sentence is left alone; `Linkify` still handles it.
 */
export function parseBodyBlocks(paragraphs: string[]): BodyBlock[] {
  return paragraphs.map((paragraph) => {
    // Textareas can post back CRLF, so split on either line ending.
    const [first, ...rest] = paragraph.split(/\r?\n/);
    const candidate = normalizeMediaUrl(first ?? "");

    if (/^(https?:\/\/|\/)\S*$/.test(candidate) && isMediaUrl(candidate)) {
      return {
        type: "media",
        url: candidate,
        caption: rest.map((line) => line.trim()).join(" ").trim(),
      };
    }

    return { type: "text", text: paragraph };
  });
}
