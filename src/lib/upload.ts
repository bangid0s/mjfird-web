"use client";

import { createClient } from "@/lib/supabase/client";
import { compressForMedia } from "@/lib/client/media-compress";

// Uploads a file to the public `media` bucket and returns its public URL.
// Images are first squeezed to ≤300 KB / ≤2400px WebP (see media-compress).
export async function uploadToMedia(picked: File): Promise<string> {
  const file = await compressForMedia(picked);
  const supabase = createClient();
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}
