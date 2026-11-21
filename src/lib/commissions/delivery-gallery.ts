import { clientFileName } from "@/lib/commissions/client-files";
import { slugifyGallery } from "@/lib/gallery-slug";

/*
  What a delivered commission puts in the gallery, as pure rules. The
  side effects (download, convert, upload, insert) live in
  delivery-gallery-run.ts.
*/

/**
 * May the final piece be shown? Only an explicit yes: "public" or
 * "final_only". "nda", and requests from before the sharing question
 * existed (null), stay private.
 */
export function mayShowInGallery(sharing: string | null | undefined): boolean {
  return sharing === "public" || sharing === "final_only";
}

const IMAGE = /\.(png|jpe?g|webp)$/i;

/** The first delivered still image (PSDs, ZIPs, videos and GIFs are skipped). */
export function pickDeliveryImage(paths: string[]): string | null {
  return paths.find((path) => IMAGE.test(clientFileName(path))) ?? null;
}

type OrderFacts = {
  ref: number;
  service_title: string;
  package_name: string;
  extra_characters: number;
  background_name: string | null;
  delivered_at?: string | null;
};

/** "Half Body, 2 characters, simple background" — no price, no client name. */
export function orderSummary(req: OrderFacts): string {
  const characters = 1 + Math.max(0, req.extra_characters || 0);
  const parts = [req.package_name.trim()];
  if (characters > 1) parts.push(`${characters} characters`);
  const background = (req.background_name ?? "").trim();
  if (background && !/^no\b/i.test(background)) {
    const lower = background.toLowerCase();
    parts.push(lower.includes("background") ? lower : `${lower} background`);
  }
  return parts.filter(Boolean).join(", ");
}

/** Title, description and storage name for the gallery item. */
export function deliveryGalleryItem(req: OrderFacts) {
  const summary = orderSummary(req);
  const month = req.delivered_at
    ? new Date(req.delivered_at).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : "";
  return {
    title: `${req.package_name.trim()} — ${req.service_title.trim()}`.slice(0, 120),
    caption: `Client commission: ${summary}.${month ? ` Delivered ${month}.` : ""} Hand-drawn by M.J. Fird.`,
    fileName: `art/${slugifyGallery(`${req.service_title} ${req.package_name} commission ${req.ref}`) || `commission-${req.ref}`}.webp`,
  };
}
