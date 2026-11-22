import type { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { deliveryGalleryItem, mayShowInGallery, pickDeliveryImage } from "@/lib/commissions/delivery-gallery";
import { uniqueGallerySlug } from "@/lib/gallery-slug";
import { fitToBudget, MEDIA_MAX_EDGE } from "@/lib/media-budget";
import type { CommissionRequestRow } from "@/lib/supabase/types";

/*
  Delivered order → live gallery item, once per order. Runs with the admin's
  session (it reads the private `commissions` bucket and writes the public
  `media` one). Never throws: a gallery hiccup must not undo a delivery.
*/

export type DeliveryGalleryResult =
  | { status: "added"; slug: string }
  | { status: "skipped"; reason: "not_shareable" | "no_image" | "already_added" | "not_delivered" }
  | { status: "failed"; reason: string };

export async function publishDeliveryToGallery(
  supabase: SupabaseClient,
  req: Pick<
    CommissionRequestRow,
    | "id" | "ref" | "status" | "sharing" | "delivery_paths" | "service_id" | "service_title"
    | "package_name" | "extra_characters" | "background_name" | "delivered_at"
  >,
): Promise<DeliveryGalleryResult> {
  try {
    if (req.status !== "delivered" && req.status !== "completed") return { status: "skipped", reason: "not_delivered" };
    if (!mayShowInGallery(req.sharing)) return { status: "skipped", reason: "not_shareable" };
    const path = pickDeliveryImage(req.delivery_paths ?? []);
    if (!path) return { status: "skipped", reason: "no_image" };

    const { data: existing } = await supabase.from("gallery_items").select("id").eq("request_id", req.id).limit(1);
    if (existing && existing.length > 0) return { status: "skipped", reason: "already_added" };

    const { data: blob, error: downloadError } = await supabase.storage.from("commissions").download(path);
    if (downloadError || !blob) return { status: "failed", reason: downloadError?.message ?? "download failed" };

    const source = sharp(Buffer.from(await blob.arrayBuffer())).rotate();
    const meta = await source.metadata();
    const { out } = await fitToBudget(Math.max(meta.width ?? MEDIA_MAX_EDGE, meta.height ?? 0), async ({ edge, quality }) => {
      const data = await source
        .clone()
        .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
        .webp({ quality, effort: 5 })
        .toBuffer();
      return { data, size: data.length };
    });
    const webp = out.data;

    const item = deliveryGalleryItem({ ...req, delivered_at: req.delivered_at ?? new Date().toISOString() });
    const media = supabase.storage.from("media");
    const { error: uploadError } = await media.upload(item.fileName, webp, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
    if (uploadError) return { status: "failed", reason: uploadError.message };
    const imageUrl = media.getPublicUrl(item.fileName).data.publicUrl;

    const [{ data: service }, { data: slugRows }, { data: first }] = await Promise.all([
      req.service_id
        ? supabase.from("services").select("category").eq("id", req.service_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("gallery_items").select("slug").not("slug", "is", null),
      supabase.from("gallery_items").select("sort_order").order("sort_order", { ascending: true }).limit(1),
    ]);
    const slug = uniqueGallerySlug(item.title, (slugRows ?? []).map((r) => r.slug as string));
    const category = ((service as { category?: string | null } | null)?.category ?? "").trim();

    const { error: insertError } = await supabase.from("gallery_items").insert({
      image_url: imageUrl,
      title: item.title,
      caption: item.caption,
      slug,
      tags: category ? [category] : [],
      service_ids: req.service_id ? [req.service_id] : [],
      // The client's name only ever appears through their own public review.
      client_name: null,
      request_id: req.id,
      status: "published",
      // Newest commission first.
      sort_order: ((first?.[0]?.sort_order as number | undefined) ?? 0) - 1,
    });
    if (insertError) {
      // Lost a race with a second click: the other one added it.
      if (/gallery_items_request_key|duplicate key/i.test(insertError.message)) {
        return { status: "skipped", reason: "already_added" };
      }
      return { status: "failed", reason: insertError.message };
    }
    return { status: "added", slug };
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : String(error) };
  }
}
