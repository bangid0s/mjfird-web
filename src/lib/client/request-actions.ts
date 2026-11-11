"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyRpcError } from "@/lib/commissions/status";
import { ADMIN_EMAIL, sendEmail } from "@/lib/email";
import { mapStorefrontRow } from "@/lib/data/services";
import type { CommissionAnswer, CommissionRequestRow, ServiceRow } from "@/lib/supabase/types";
import { formatUSD } from "@/lib/services/storefront";

export type RequestState = { error?: string; done?: boolean } | undefined;

const answerSchema = z.object({
  id: z.string().max(64),
  label: z.string().max(200),
  value: z.union([z.string().max(5000), z.array(z.string().max(500)).max(30)]),
});

function parseJson<T>(raw: FormDataEntryValue | null, schema: z.ZodType<T>, fallback: T): T {
  try {
    const parsed = schema.safeParse(JSON.parse(String(raw ?? "")));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export async function submitRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const serviceId = String(formData.get("service_id") ?? "");
  const { data: row } = await supabase.from("services").select("*").eq("id", serviceId).maybeSingle();
  if (!row) return { error: "That service isn't available anymore." };
  const service = mapStorefrontRow(row as ServiceRow);

  const answers = parseJson<CommissionAnswer[]>(formData.get("answers"), z.array(answerSchema).max(40), []);
  const referencePaths = parseJson<string[]>(formData.get("reference_paths"), z.array(z.string().max(400)).max(20), []);

  // Required questions — the database prices the order; the app checks the form.
  for (const q of service.questions) {
    if (!q.required || q.type === "file") continue;
    const a = answers.find((x) => x.id === q.id);
    const empty = !a || (Array.isArray(a.value) ? a.value.length === 0 : !a.value.trim());
    if (empty) return { error: `Please answer: ${q.label}` };
  }
  // Keep only answers to real questions, labelled from the stored service.
  const cleanAnswers = service.questions
    .map((q) => {
      const a = answers.find((x) => x.id === q.id);
      return a ? { id: q.id, label: q.label, value: a.value } : null;
    })
    .filter(Boolean);

  const { data: requestId, error } = await supabase.rpc("submit_commission_request", {
    p_service_id: service.id,
    p_package_id: String(formData.get("package_id") ?? ""),
    p_addon_ids: formData.getAll("addon_ids").map(String),
    p_extra_characters: Math.max(0, Number.parseInt(String(formData.get("extra_characters") ?? "0"), 10) || 0),
    p_contact_name: String(formData.get("contact_name") ?? ""),
    p_brief: String(formData.get("brief") ?? ""),
    p_answers: cleanAnswers,
    p_reference_paths: referencePaths,
  });
  if (error || !requestId) return { error: friendlyRpcError(error?.message ?? "") };

  const { data: created } = await supabase.from("commission_requests").select("*").eq("id", requestId).single();
  const req = created as CommissionRequestRow | null;
  if (req) {
    const total = formatUSD(Number(req.estimated_total));
    const extra = req.extra_characters ?? 0;
    const characters = extra ? ` · ${extra + 1} characters` : "";
    await Promise.all([
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `New request #${req.ref}: ${req.service_title} — ${req.package_name} (${total})`,
        lines: [
          `${req.contact_name} (${req.contact_email}) requested ${req.service_title} — ${req.package_name}${characters}.`,
          `Estimated total: ${total}${req.waitlisted ? " · joined the waitlist" : ""}`,
          req.brief,
        ],
        cta: { label: "Review request", path: `/admin/requests/${req.id}` },
        replyTo: req.contact_email,
      }),
      sendEmail({
        to: req.contact_email,
        subject: `Request received — ${req.service_title} (#${req.ref})`,
        lines: [
          `Hi ${req.contact_name},`,
          `Thanks for your request for ${req.service_title} — ${req.package_name}${characters}. I review every request myself and will get back to you soon.`,
          `Estimated total: ${total}. No payment is needed until I accept.`,
        ],
        cta: { label: "View your request", path: `/account/requests/${req.id}` },
      }),
    ]);
  }

  revalidatePath("/account");
  redirect(`/account/requests/${requestId}?submitted=1`);
}

export async function cancelRequest(requestId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_commission_request", { p_request_id: requestId });
  if (error) throw new Error(friendlyRpcError(error.message));

  const { data } = await supabase.from("commission_requests").select("ref, contact_name, service_title").eq("id", requestId).single();
  if (data) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Request #${data.ref} cancelled by client`,
      lines: [`${data.contact_name} cancelled their request for ${data.service_title}.`],
      cta: { label: "Open request", path: `/admin/requests/${requestId}` },
    });
  }
  revalidatePath(`/account/requests/${requestId}`);
  revalidatePath("/account");
}

export async function postClientMessage(requestId: string, _prev: RequestState, formData: FormData): Promise<RequestState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  if (body.length > 5000) return { error: "That message is too long (5,000 characters max)." };

  const supabase = await createClient();
  const { error } = await supabase.from("commission_messages").insert({ request_id: requestId, body });
  if (error) return { error: "Couldn't send that message. Please try again." };

  const { data } = await supabase.from("commission_requests").select("ref, contact_name, contact_email").eq("id", requestId).single();
  if (data) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New message on request #${data.ref}`,
      lines: [`${data.contact_name} wrote:`, body],
      cta: { label: "Reply", path: `/admin/requests/${requestId}` },
      replyTo: data.contact_email,
    });
  }
  revalidatePath(`/account/requests/${requestId}`);
  return undefined;
}

export async function submitReview(requestId: string, _prev: RequestState, formData: FormData): Promise<RequestState> {
  const rating = Number.parseInt(String(formData.get("rating") ?? ""), 10);
  const visibility = String(formData.get("visibility") ?? "");
  if (visibility !== "public" && visibility !== "private") {
    return { error: "Please choose whether your review can be shown on the site." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_commission_review", {
    p_request_id: requestId,
    p_rating: Number.isFinite(rating) ? rating : 0,
    p_quote: String(formData.get("quote") ?? ""),
    p_name: String(formData.get("name") ?? ""),
    p_role: String(formData.get("role") ?? ""),
    p_public: visibility === "public",
  });
  if (error) return { error: friendlyRpcError(error.message) };

  const { data } = await supabase.from("commission_requests").select("ref, contact_name, service_title").eq("id", requestId).single();
  if (data) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New ${rating}★ review on #${data.ref} — waiting for approval`,
      lines: [
        `${data.contact_name} reviewed ${data.service_title} (${visibility === "public" ? "OK to show publicly" : "private feedback only"}).`,
        String(formData.get("quote") ?? ""),
      ],
      cta: { label: "Review it", path: "/admin/testimonials" },
    });
  }
  revalidatePath(`/account/requests/${requestId}`);
  revalidatePath(`/admin/requests/${requestId}`);
  revalidatePath("/admin/testimonials");
  // An edit unpublishes it until approved again.
  revalidatePath("/");
  revalidatePath("/services", "layout");
  return { done: true };
}
