"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseClientProfile } from "@/lib/client/profile";

export type ProfileState = { error?: string; message?: string } | undefined;

export async function updateClientProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = parseClientProfile(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  // Only these columns; RLS limits the row to the signed-in client.
  const { error } = await supabase.from("client_profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "Could not save your profile. Please try again." };

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { message: "Profile saved." };
}
