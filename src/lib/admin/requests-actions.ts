"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { manualAdvanceConflict, manualWritePlan, priceOf } from "@/lib/commissions/status";
import { readPaypalSandboxConfig } from "@/lib/payments/config";
import { formatUSD } from "@/lib/services/storefront";
import type { CommissionRequestRow, CommissionStatus } from "@/lib/supabase/types";

type State = { error?: string } | undefined;

async function load(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("commission_requests").select("*").eq("id", id).single();
  if (!data) throw new Error("Request not found.");
  return { supabase, req: data as CommissionRequestRow };
}

function refresh(id: string) {
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${id}`);
  revalidatePath(`/account/requests/${id}`);
  revalidatePath("/account");
}

function missingDbObject(message: string, name: string) {
  return message.includes(name) && message.includes("does not exist");
}

async function checkoutTableState(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase.from("commission_paypal_checkouts").select("request_id").limit(1);
  if (!error) return "present" as const;
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  if (code === "42P01" || missingDbObject(error.message, "commission_paypal_checkouts")) return "absent" as const;
  return "unknown" as const;
}

async function bumpSlots(supabase: Awaited<ReturnType<typeof createClient>>, serviceId: string | null, delta: 1 | -1) {
  if (!serviceId) return;
  const { data } = await supabase.from("services").select("slots_taken").eq("id", serviceId).single();
  if (!data) return;
  await supabase
    .from("services")
    .update({ slots_taken: Math.max(0, (data.slots_taken ?? 0) + delta) })
    .eq("id", serviceId);
  revalidatePath("/services");
  revalidatePath("/services/[slug]", "page");
}

export async function acceptRequest(id: string, formData: FormData) {
  const { supabase, req } = await load(id);
  if (req.status !== "pending") throw new Error("Only pending requests can be accepted.");

  const raw = Number.parseFloat(String(formData.get("final_price") ?? ""));
  const finalPrice = Number.isFinite(raw) && raw >= 0 ? Math.round(raw * 100) / 100 : priceOf(req);
  const note = String(formData.get("artist_note") ?? "").trim();

  const { error } = await supabase
    .from("commission_requests")
    .update({ status: "awaiting_payment", final_price: finalPrice, artist_note: note, accepted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await bumpSlots(supabase, req.service_id, 1);

  await sendEmail({
    to: req.contact_email,
    subject: `Accepted: ${req.service_title} (#${req.ref}) — ${formatUSD(finalPrice)}`,
    lines: [
      `Hi ${req.contact_name},`,
      `Good news — I've accepted your request for ${req.service_title} — ${req.package_name}.`,
      `Final price: ${formatUSD(finalPrice)} (USD).`,
      ...(note ? [note] : []),
      "Open your request to see the details and next steps.",
    ],
    cta: { label: "View request", path: `/account/requests/${id}` },
  });
  refresh(id);
}

export async function declineRequest(id: string, formData: FormData) {
  const { supabase, req } = await load(id);
  if (req.status !== "pending") throw new Error("Only pending requests can be declined.");
  const note = String(formData.get("artist_note") ?? "").trim();

  const { error } = await supabase.from("commission_requests").update({ status: "declined", artist_note: note }).eq("id", id);
  if (error) throw new Error(error.message);

  await sendEmail({
    to: req.contact_email,
    subject: `About your request for ${req.service_title} (#${req.ref})`,
    lines: [
      `Hi ${req.contact_name},`,
      `Thank you for your request for ${req.service_title}. Unfortunately I'm not able to take it on this time.`,
      ...(note ? [note] : []),
    ],
    cta: { label: "View request", path: `/account/requests/${id}` },
  });
  refresh(id);
}

const NEXT_STATUS: Partial<Record<CommissionStatus, { to: CommissionStatus; stamp?: string }>> = {
  awaiting_payment: { to: "in_progress", stamp: "paid_at" },
  in_progress: { to: "delivered", stamp: "delivered_at" },
  delivered: { to: "completed", stamp: "completed_at" },
};

/** Move a request one step along the happy path. */
export async function advanceRequest(id: string) {
  const { supabase, req } = await load(id);
  const step = NEXT_STATUS[req.status];
  if (!step) throw new Error("Nothing to advance.");

  if (req.status === "awaiting_payment") {
    const { error } = await supabase.rpc("mark_commission_paid_manual", { p_request_id: id });
    if (error && missingDbObject(error.message, "mark_commission_paid_manual")) {
      const plan = manualWritePlan({
        rpcMissing: true,
        checkoutTable: await checkoutTableState(supabase),
        paypalEnabled: readPaypalSandboxConfig() !== null,
      });
      if (plan !== "legacy") throw new Error("PayPal checkout can't change this request until its database functions are installed.");
      const { data: updated, error: legacyError } = await supabase
        .from("commission_requests")
        .update({ status: "in_progress", paid_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "awaiting_payment")
        .select("id");
      if (legacyError || !updated || updated.length === 0) throw new Error("This request changed. Refresh and try again.");
    } else if (error) {
      throw new Error(manualAdvanceConflict(error.message));
    }
  } else {
    const { data: updated, error } = await supabase
      .from("commission_requests")
      .update({ status: step.to, ...(step.stamp && { [step.stamp]: new Date().toISOString() }) })
      .eq("id", id)
      .eq("status", req.status)
      .select("id");
    if (error) throw new Error(error.message);
    if (!updated || updated.length === 0) {
      throw new Error("This request changed. Refresh and try again.");
    }
  }

  // A finished commission frees its slot.
  if (step.to === "completed") await bumpSlots(supabase, req.service_id, -1);

  const copy: Partial<Record<CommissionStatus, [string, string]>> = {
    in_progress: [`Work has started on #${req.ref}`, "Payment is confirmed and I've started on your commission."],
    delivered: [`Your ${req.service_title} is ready (#${req.ref})`, "Your files are ready — open your request to download them."],
    completed: [`Completed: ${req.service_title} (#${req.ref})`, "This commission is now complete. Thank you so much!"],
  };
  const [subject, line] = copy[step.to] ?? [];
  if (subject && line) {
    await sendEmail({
      to: req.contact_email,
      subject,
      lines: [`Hi ${req.contact_name},`, line],
      cta: { label: "View request", path: `/account/requests/${id}` },
    });
  }
  refresh(id);
}

export async function cancelRequestAsAdmin(id: string) {
  const { supabase, req } = await load(id);
  if (["completed", "declined", "cancelled"].includes(req.status)) throw new Error("Already closed.");
  const { error } = await supabase.rpc("admin_cancel_commission_request", { p_request_id: id });
  if (error && missingDbObject(error.message, "admin_cancel_commission_request")) {
    const plan = manualWritePlan({
      rpcMissing: true,
      checkoutTable: await checkoutTableState(supabase),
      paypalEnabled: readPaypalSandboxConfig() !== null,
    });
    if (plan !== "legacy") throw new Error("PayPal checkout can't change this request until its database functions are installed.");
    const { error: legacyError } = await supabase.from("commission_requests").update({ status: "cancelled" }).eq("id", id);
    if (legacyError) throw new Error("This request changed. Refresh and try again.");
    if (req.status !== "pending") await bumpSlots(supabase, req.service_id, -1);
  } else if (error) {
    throw new Error(manualAdvanceConflict(error.message));
  }
  refresh(id);
}

export async function saveArtistNote(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_requests")
    .update({ artist_note: String(formData.get("artist_note") ?? "").trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
}

export async function addDeliveryFiles(id: string, paths: string[]) {
  const { supabase, req } = await load(id);
  const valid = paths.filter((p) => p.startsWith(`${req.client_id}/deliveries/${id}/`) && !p.includes(".."));
  const { error } = await supabase
    .from("commission_requests")
    .update({ delivery_paths: [...req.delivery_paths, ...valid] })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
}

export async function removeDeliveryFile(id: string, path: string) {
  const { supabase, req } = await load(id);
  await supabase.storage.from("commissions").remove([path]);
  await supabase
    .from("commission_requests")
    .update({ delivery_paths: req.delivery_paths.filter((p) => p !== path) })
    .eq("id", id);
  refresh(id);
}

export async function postAdminMessage(id: string, _prev: State, formData: FormData): Promise<State> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  const { supabase, req } = await load(id);
  const { error } = await supabase.from("commission_messages").insert({ request_id: id, body });
  if (error) return { error: error.message };

  await sendEmail({
    to: req.contact_email,
    subject: `New message about your request #${req.ref}`,
    lines: [`Hi ${req.contact_name},`, body],
    cta: { label: "Reply", path: `/account/requests/${id}` },
  });
  refresh(id);
  return undefined;
}
