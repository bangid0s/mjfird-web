/**
 * Colour helpers for the one colour the admin controls: the site accent.
 *
 * The accent is a free-form hex from `/admin/settings`, so nothing downstream
 * can assume it is dark (white text) or light (dark text). These pick the
 * readable pairing instead of guessing.
 */

const WHITE = "#ffffff";
const NEAR_BLACK = "#0b0b0d";

export type Rgb = { r: number; g: number; b: number };

/** Accepts `#rgb`, `#rrggbb`, and the same without the hash. */
export function parseHex(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(value)) {
    return {
      r: parseInt(value[0] + value[0], 16),
      g: parseInt(value[1] + value[1], 16),
      b: parseInt(value[2] + value[2], 16),
    };
  }

  if (/^[0-9a-f]{6}$/i.test(value)) {
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  return null;
}

/** WCAG relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The text colour to put *on* the accent — whichever of white or near-black
 * has more contrast against it. An unparseable value falls back to white,
 * which is right for the default indigo.
 */
export function readableInk(accentHex: string): string {
  const accent = parseHex(accentHex);
  if (!accent) return WHITE;

  const onWhite = contrastRatio(accent, { r: 255, g: 255, b: 255 });
  const onBlack = contrastRatio(accent, { r: 11, g: 11, b: 13 });

  return onWhite >= onBlack ? WHITE : NEAR_BLACK;
}
