import { Resend } from "resend";
import { SITE_URL } from "@/lib/site-url";

/*
  Transactional email via Resend. Quietly does nothing when RESEND_API_KEY
  isn't set, so a missing key never breaks a request — it just means no email.
  RESEND_FROM must be an address on a domain verified in Resend.
*/

const FROM = process.env.RESEND_FROM ?? "MJFIRD <notifications@mjfird.com>";

export const ADMIN_EMAIL = process.env.INQUIRY_NOTIFY_EMAIL ?? "info@mjfird.com";

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendEmail({
  to,
  subject,
  lines,
  cta,
  replyTo,
}: {
  to: string;
  subject: string;
  lines: string[];
  cta?: { label: string; path: string };
  replyTo?: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;

  const body = lines.map((l) => `<p style="margin:0 0 14px">${escape(l).replace(/\n/g, "<br>")}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${SITE_URL}${cta.path}" style="background:#f04e23;color:#111;padding:12px 20px;text-decoration:none;font-weight:600">${escape(cta.label)}</a></p>`
    : "";
  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px">${body}${button}<p style="color:#888;font-size:13px;margin-top:32px">MJFIRD · ${SITE_URL.replace(/^https?:\/\//, "")}</p></div>`;
  const text = [...lines, ...(cta ? [`${cta.label}: ${SITE_URL}${cta.path}`] : [])].join("\n\n");

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, text, replyTo });
    if (error) console.error("[email] send failed", error.message);
  } catch (err) {
    console.error("[email] send failed", err instanceof Error ? err.message : err);
  }
}
