"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

export type WaitlistState = { done?: true; error?: string } | undefined;

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  service: z.string().trim().max(120).regex(/^[a-z0-9-]*$/).optional(),
});

/**
 * "Notify me when slots open". Anyone may join; only the admin can read the
 * list (row-level security). Joining twice is fine and says so.
 */
export async function joinSlotWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  // Hidden field people never see: anything in it is a bot.
  if (String(formData.get("website") ?? "") !== "") return { done: true };

  const parsed = schema.safeParse({
    email: formData.get("email"),
    service: String(formData.get("service") ?? "") || undefined,
  });
  if (!parsed.success) return { error: "Please enter a valid email address." };

  const { error } = await createPublicClient()
    .from("slot_waitlist")
    .insert({ email: parsed.data.email, service_slug: parsed.data.service ?? null });
  // 23505: already on the list, which is what they wanted.
  if (error && error.code !== "23505") return { error: "Couldn't save that right now. Please try again in a minute." };
  return { done: true };
}
