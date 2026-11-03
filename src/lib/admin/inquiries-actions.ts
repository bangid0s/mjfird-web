"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InquiryStatus } from "@/lib/supabase/types";

export async function setInquiryStatus(id: string, status: InquiryStatus) {
  const supabase = await createClient();
  await supabase.from("inquiries").update({ status }).eq("id", id);
  // "layout" so the sidebar's unread badge and the dashboard update too.
  revalidatePath("/admin", "layout");
}

/** Permanent — the message is gone, not archived. The button arms first. */
export async function deleteInquiry(id: string) {
  const supabase = await createClient();
  await supabase.from("inquiries").delete().eq("id", id);
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
}
