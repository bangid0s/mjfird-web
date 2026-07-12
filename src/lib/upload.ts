"use client";

import { createClient } from "@/lib/supabase/client";

// Uploads a file to the public `media` bucket and returns its public URL.
export async function uploadToMedia(file: File): Promise<string> {
  const supabase = createClient();
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}
