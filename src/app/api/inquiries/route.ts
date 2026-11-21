import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/config";
import { INQUIRY_EMAIL, sendEmail } from "@/lib/email";
import { inquiryAdminEmail, inquiryClientEmail } from "@/lib/notifications/copy";
import { foundViaLabel, isFoundVia } from "@/lib/found-via";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  projectType: z.string().min(1).max(60),
  budget: z.string().min(1).max(60),
  // Optional here so a tab opened before this field shipped can still send.
  foundVia: z.string().refine(isFoundVia).optional(),
  message: z.string().min(20).max(5000),
  company: z.string().max(0).optional(), // honeypot — must stay empty
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid inquiry" }, { status: 400 });
  }

  if (parsed.data.company) {
    // Honeypot tripped — pretend success, drop silently.
    return NextResponse.json({ ok: true });
  }

  const record = {
    name: parsed.data.name,
    email: parsed.data.email,
    project_type: parsed.data.projectType,
    budget: parsed.data.budget,
    // Only sent when answered, so older clients still save before migration 0052.
    ...(parsed.data.foundVia ? { found_via: parsed.data.foundVia } : {}),
    message: parsed.data.message,
  };

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    let { error } = await supabase.from("inquiries").insert(record);
    if (error && "found_via" in record && isMissingFoundViaColumn(error)) {
      // Migration 0052 not applied yet: save without the column and keep the
      // answer in the message so the lead's channel isn't lost.
      const { found_via, ...rest } = record;
      ({ error } = await supabase
        .from("inquiries")
        .insert({ ...rest, message: `${rest.message}\n\nFound me via: ${foundViaLabel(found_via)}` }));
    }
    if (error) {
      console.error("[inquiry] insert failed", error.message);
      return NextResponse.json({ error: "Could not save inquiry" }, { status: 500 });
    }
  } else {
    // No Supabase configured yet — log so the inquiry isn't silently lost.
    console.log("[inquiry]", record);
  }

  // Studio alert (reply goes straight to the sender) + confirmation to the sender.
  // sendEmail never throws and is a no-op without RESEND_API_KEY.
  await Promise.all([
    sendEmail({ to: INQUIRY_EMAIL, ...inquiryAdminEmail(parsed.data), replyTo: parsed.data.email }),
    sendEmail({ to: parsed.data.email, ...inquiryClientEmail(parsed.data), replyTo: INQUIRY_EMAIL }),
  ]);

  return NextResponse.json({ ok: true });
}

/** PostgREST (schema cache) or Postgres saying inquiries has no found_via column. */
function isMissingFoundViaColumn(error: { code?: string; message?: string }) {
  return (error.code === "PGRST204" || error.code === "42703") && /found_via/.test(error.message ?? "");
}
