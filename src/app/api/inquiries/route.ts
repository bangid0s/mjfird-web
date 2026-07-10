import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/data/config";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  projectType: z.string().min(1),
  budget: z.string().min(1),
  message: z.string().min(20),
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
    message: parsed.data.message,
  };

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.from("inquiries").insert(record);
    if (error) {
      console.error("[inquiry] insert failed", error.message);
      return NextResponse.json({ error: "Could not save inquiry" }, { status: 500 });
    }
  } else {
    // No Supabase configured yet — log so the inquiry isn't silently lost.
    console.log("[inquiry]", record);
  }

  // TODO: once RESEND_API_KEY is set, notify INQUIRY_NOTIFY_EMAIL via Resend here.

  return NextResponse.json({ ok: true });
}
