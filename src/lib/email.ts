import { Resend } from "resend";
import { renderEmailHtml } from "@/lib/email-template";
import { SITE_URL } from "@/lib/site-url";

/*
  Transactional email via Resend. Quietly does nothing when RESEND_API_KEY
  isn't set, so a missing key never breaks a request — it just means no email.
  RESEND_FROM must be an address on a domain verified in Resend.
*/

const FROM = process.env.RESEND_FROM ?? "MJFIRD <notifications@mjfird.com>";

// Studio inboxes. Contact-form inquiries / project emails go to hello@;
// commission requests, revisions, approvals and payments go to info@.
export const INQUIRY_EMAIL = process.env.INQUIRY_NOTIFY_EMAIL || "hello@mjfird.com";
export const COMMISSION_EMAIL = process.env.COMMISSION_NOTIFY_EMAIL || "info@mjfird.com";

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

  const html = renderEmailHtml({
    subject,
    lines,
    cta: cta ? { label: cta.label, href: `${SITE_URL}${cta.path}` } : undefined,
    siteUrl: SITE_URL,
  });
  const text = [...lines, ...(cta ? [`${cta.label}: ${SITE_URL}${cta.path}`] : [])].join("\n\n");

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html, text, replyTo });
    if (error) console.error("[email] send failed", error.message);
  } catch (err) {
    console.error("[email] send failed", err instanceof Error ? err.message : err);
  }
}
