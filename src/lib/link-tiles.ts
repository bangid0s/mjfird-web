import type { LinkTileSize } from "@/lib/supabase/types";

// How much of the two-column bento grid a link tile claims, in the order the
// admin's picker offers them.
export const LINK_TILE_SIZES: { value: LinkTileSize; label: string }[] = [
  { value: "small", label: "Small 1×1" },
  { value: "wide", label: "Wide 2×1" },
  { value: "tall", label: "Tall 1×2" },
  { value: "large", label: "Large 2×2" },
];

export function parseTileSize(value: string | null | undefined): LinkTileSize {
  return LINK_TILE_SIZES.some((size) => size.value === value)
    ? (value as LinkTileSize)
    : "small";
}
