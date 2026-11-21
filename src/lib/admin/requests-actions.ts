"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { manualAdvanceConflict, manualWritePlan, priceOf, toNumber } from "@/lib/commissions/status";
import { isQuoteRequest } from "@/lib/commissions/quote";
import {
  PaymentUrlError,
  acceptEmailCopy,
  normalizePaymentUrl,
  paymentReadyEmailCopy,
  paymentWriteMessage,
  safePaymentUrl,
} from "@/lib/commissions/payment-link";
import { DeliveryUrlError, normalizeDeliveryUrl } from "@/lib/commissions/delivery-link";
import { readPaypalSandboxConfig } from "@/lib/payments/config";
import { formatUSD } from "@/lib/services/storefront";
import type { CommissionRequestRow, CommissionStatus } from "@/lib/supabase/types";
import { publishDeliveryToGallery } from "@/lib/commissions/delivery-gallery-run";

type State = { error?: string } | undefined;

/*
  Why the admin buttons felt stuck:
  - Every action awaited the client email (Resend) before the page could
    refresh, with no timeout. Emails now go out with after(), once the
    response — and the refreshed page — is already on its way.
  - The refresh was the last line, so anything failing after the database
    write left a changed request on an unchanged screen. Refresh now runs
    right after the write.
  - Thrown errors reach the browser as a generic message in production, so
    actions return { error } instead and the real reason is shown.
*/

/** Sends the email after the response is sent, so a slow mail API never holds up the screen. */
function emailLater(args: Parameters<typeof sendEmail>[0]) {
  after(() => sendEmail(args));
}

async function guard(fn: () => Promise<void>): Promise<State> {
  try {
    await fn();
    return undefined;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong. Please try again." };
  }
}

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

/**
 * A shareable delivered order lands in the public gallery by itself. Runs
 * after the request is saved and never fails the action: a gallery problem
 * is logged, the delivery stands.
 */
async function addToGalleryIfShareable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  req: CommissionRequestRow,
) {
  const result = await publishDeliveryToGallery(supabase, req);
  if (result.status === "added") {
    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");
    revalidatePath("/services", "layout");
  } else if (result.status === "failed") {
    console.error(`Gallery: could not add request ${req.id}: ${result.reason}`);
  }
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

/** Slot counting is bookkeeping: if it fails, the request change still stands, so log instead of erroring. */
async function bumpSlots(supabase: Awaited<ReturnType<typeof createClient>>, serviceId: string | null, delta: 1 | -1) {
  if (!serviceId) return;
  try {
    const { data } = await supabase.from("services").select("slots_taken").eq("id", serviceId).single();
    if (!data) return;
    const { error } = await supabase
      .from("services")
      .update({ slots_taken: Math.max(0, (data.slots_taken ?? 0) + delta) })
      .eq("id", serviceId);
    if (error) console.error("[requests] slot count not updated:", error.message);
    revalidatePath("/services");
    revalidatePath("/services/[slug]", "page");
  } catch (err) {
    console.error("[requests] slot count not updated:", err instanceof Error ? err.message : err);
  }
}

export async function acceptRequest(id: string, formData: FormData): Promise<State> {
  return guard(() => acceptRequestNow(id, formData));
}

async function acceptRequestNow(id: string, formData: FormData) {
  const { supabase, req } = await load(id);
  if (req.status !== "pending") throw new Error("Only pending requests can be accepted.");

  const raw = Number.parseFloat(String(formData.get("final_price") ?? ""));
  const finalPrice = Number.isFinite(raw) && raw >= 0 ? Math.round(raw * 100) / 100 : priceOf(req);
  if (isQuoteRequest(req) && !(finalPrice > 0)) throw new Error("This is a custom quote. Enter the price before accepting.");
  const note = String(formData.get("artist_note") ?? "").trim();
  const paymentUrl = readPaymentUrl(formData);

  const patch: {
    status: "awaiting_payment";
    final_price: number;
    artist_note: string;
    accepted_at: string;
    payment_url?: string;
  } = {
    status: "awaiting_payment",
    final_price: finalPrice,
    artist_note: note,
    accepted_at: new Date().toISOString(),
  };
  if (paymentUrl) patch.payment_url = paymentUrl;

  const { data: updated, error } = await supabase
    .from("commission_requests")
    .update(patch)
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) throw new Error(paymentWriteMessage(error.message) ?? error.message);
  if (!updated || updated.length === 0) throw new Error("This request changed. Refresh and try again.");
  refresh(id);
  await bumpSlots(supabase, req.service_id, 1);

  const mail = acceptEmailCopy({
    contactName: req.contact_name,
    serviceTitle: req.service_title,
    packageName: req.package_name,
    ref: req.ref,
    priceLabel: formatUSD(finalPrice),
    note,
    paymentReady: Boolean(paymentUrl || safePaymentUrl(req.payment_url)),
    requestId: id,
  });
  emailLater({ to: req.contact_email, subject: mail.subject, lines: mail.lines, cta: mail.cta });
  refresh(id);
}

function readPaymentUrl(formData: FormData) {
  try {
    return normalizePaymentUrl(String(formData.get("payment_url") ?? ""));
  } catch (err) {
    throw new Error(err instanceof PaymentUrlError ? err.message : "Use an https link on paypal.com or paypal.me.");
  }
}

/** Paste, replace, or clear the PayPal link. Does not change status or price. */
export async function setPaymentUrl(id: string, formData: FormData): Promise<State> {
  return guard(() => setPaymentUrlNow(id, formData));
}

async function setPaymentUrlNow(id: string, formData: FormData) {
  const { supabase, req } = await load(id);
  if (req.status !== "pending" && req.status !== "awaiting_payment") {
    throw new Error("The payment link can only be changed while the request is pending or awaiting payment.");
  }
  const paymentUrl = readPaymentUrl(formData);
  const previous = safePaymentUrl(req.payment_url);
  const { error } = await supabase.rpc("set_commission_payment_url", { p_request_id: id, p_url: paymentUrl });
  if (error) throw new Error(paymentWriteMessage(error.message) ?? error.message);

  if (req.status === "awaiting_payment" && paymentUrl && paymentUrl !== previous) {
    const amount = toNumber(req.final_price);
    const mail = paymentReadyEmailCopy({
      contactName: req.contact_name,
      serviceTitle: req.service_title,
      ref: req.ref,
      priceLabel: amount === null ? null : formatUSD(amount),
      requestId: id,
    });
    emailLater({ to: req.contact_email, subject: mail.subject, lines: mail.lines, cta: mail.cta });
  }
  refresh(id);
}

export async function declineRequest(id: string, formData: FormData): Promise<State> {
  return guard(() => declineRequestNow(id, formData));
}

async function declineRequestNow(id: string, formData: FormData) {
  const { supabase, req } = await load(id);
  if (req.status !== "pending") throw new Error("Only pending requests can be declined.");
  const note = String(formData.get("artist_note") ?? "").trim();

  const { error } = await supabase.from("commission_requests").update({ status: "declined", artist_note: note }).eq("id", id);
  if (error) throw new Error(error.message);

  emailLater({
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
export async function advanceRequest(id: string): Promise<State> {
  return guard(() => advanceRequestNow(id));
}

async function advanceRequestNow(id: string) {
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

  refresh(id);
  // A finished commission frees its slot.
  if (step.to === "completed") await bumpSlots(supabase, req.service_id, -1);
  if (step.to === "delivered") {
    await addToGalleryIfShareable(supabase, { ...req, status: "delivered", delivered_at: new Date().toISOString() });
  }

  const copy: Partial<Record<CommissionStatus, [string, string]>> = {
    in_progress: [`Work has started on #${req.ref}`, "Payment is confirmed and I've started on your commission."],
    delivered: [`Your ${req.service_title} is ready (#${req.ref})`, "Your files are ready — open your request to download them."],
    completed: [
      `Completed: ${req.service_title} (#${req.ref})`,
      "This commission is now complete. Thank you so much!\n\nIf you have a minute, you can leave a short review from your request page. It helps other clients feel confident ordering, and you choose whether it's shown publicly.",
    ],
  };
  const [subject, line] = copy[step.to] ?? [];
  if (subject && line) {
    emailLater({
      to: req.contact_email,
      subject,
      lines: [`Hi ${req.contact_name},`, line],
      cta: { label: "View request", path: `/account/requests/${id}` },
    });
  }
  refresh(id);
}

export async function cancelRequestAsAdmin(id: string): Promise<State> {
  return guard(() => cancelRequestAsAdminNow(id));
}

async function cancelRequestAsAdminNow(id: string) {
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

export async function saveArtistNote(id: string, formData: FormData): Promise<State> {
  return guard(() => saveArtistNoteNow(id, formData));
}

async function saveArtistNoteNow(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_requests")
    .update({ artist_note: String(formData.get("artist_note") ?? "").trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
}

export async function addDeliveryFiles(id: string, paths: string[]): Promise<State> {
  return guard(() => addDeliveryFilesNow(id, paths));
}

async function addDeliveryFilesNow(id: string, paths: string[]) {
  const { supabase, req } = await load(id);
  const valid = paths.filter((p) => p.startsWith(`${req.client_id}/deliveries/${id}/`) && !p.includes(".."));
  const { error } = await supabase
    .from("commission_requests")
    .update({ delivery_paths: [...req.delivery_paths, ...valid] })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh(id);
  // Files added after the request was already marked Delivered still count.
  if (req.status === "delivered" || req.status === "completed") {
    await addToGalleryIfShareable(supabase, { ...req, delivery_paths: [...req.delivery_paths, ...valid] });
  }
}

/** Paste, replace, or clear the drop link for finished files. */
export async function setDeliveryUrl(id: string, formData: FormData): Promise<State> {
  return guard(() => setDeliveryUrlNow(id, formData));
}

async function setDeliveryUrlNow(id: string, formData: FormData) {
  let url: string | null;
  try {
    url = normalizeDeliveryUrl(String(formData.get("delivery_url") ?? ""));
  } catch (err) {
    throw new Error(err instanceof DeliveryUrlError ? err.message : "Use a full https:// link.");
  }
  const { supabase } = await load(id);
  const { error } = await supabase.from("commission_requests").update({ delivery_url: url }).eq("id", id);
  if (error) {
    if (missingDbObject(error.message, "delivery_url") || error.message.includes("'delivery_url' column")) {
      throw new Error("Run supabase/migrations/0040_delivery_link_and_hero_cta.sql first, then save again.");
    }
    throw new Error(error.message);
  }
  refresh(id);
}

export async function removeDeliveryFile(id: string, path: string): Promise<State> {
  return guard(() => removeDeliveryFileNow(id, path));
}

async function removeDeliveryFileNow(id: string, path: string) {
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

  emailLater({
    to: req.contact_email,
    subject: `New message about your request #${req.ref}`,
    lines: [`Hi ${req.contact_name},`, body],
    cta: { label: "Reply", path: `/account/requests/${id}` },
  });
  refresh(id);
  return undefined;
}

// ---------- work stages (0047_work_stages.sql) ----------

/** Set which stage the order is at. Moving forward notifies the client (database trigger). */
export async function setWorkStage(id: string, index: number): Promise<State> {
  return guard(async () => {
    const { supabase, req } = await load(id);
    const stages = req.work_stages ?? [];
    if (req.status !== "in_progress" || stages.length === 0) throw new Error("Stages are only used while a request is in progress.");
    if (!Number.isInteger(index) || index < 0 || index >= stages.length) throw new Error("That stage doesn't exist.");
    const { error } = await supabase.from("commission_requests").update({ stage_index: index }).eq("id", id).eq("status", "in_progress");
    if (error) {
      if (error.message.includes("stage_index")) {
        throw new Error("Work stages need the database update: run supabase/migrations/0047_work_stages.sql, then try again.");
      }
      throw new Error(error.message);
    }
    refresh(id);
  });
}
