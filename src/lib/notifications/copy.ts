import { BUDGETS, PROJECT_TYPES } from "@/lib/inquiry-options";
import { formatUSD } from "@/lib/services/storefront";

/*
  Email copy for notifications that aren't tied to a request status change:
  contact-form inquiries and PayPal payments. Pure functions so the wording
  is testable without sending anything. sendEmail() does the HTML/escaping.
*/

export type EmailCopy = {
  subject: string;
  lines: string[];
  cta?: { label: string; path: string };
};

type Inquiry = { name: string; email: string; projectType: string; budget: string; message: string };

function labelOf(options: readonly { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

/** Header-safe one-liner: no newlines, capped, for subjects. */
function oneLine(s: string, max = 80) {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** To the studio: a new contact-form inquiry. Reply-to is the sender. */
export function inquiryAdminEmail(inq: Inquiry): EmailCopy {
  const type = labelOf(PROJECT_TYPES, inq.projectType);
  const budget = labelOf(BUDGETS, inq.budget);
  return {
    subject: `New inquiry: ${type} — ${oneLine(inq.name, 60)}`,
    lines: [
      `${inq.name} (${inq.email}) sent an inquiry through the contact form.`,
      `Project: ${type}\nBudget: ${budget}`,
      inq.message,
      "Reply to this email to answer them directly.",
    ],
    cta: { label: "Open inquiries", path: "/admin/inquiries" },
  };
}

/** To the person who wrote in: confirmation with a copy of their message. */
export function inquiryClientEmail(inq: Inquiry): EmailCopy {
  const type = labelOf(PROJECT_TYPES, inq.projectType);
  return {
    subject: "Thanks for reaching out — MJFIRD",
    lines: [
      `Hi ${inq.name},`,
      `Thanks for your message about ${type.toLowerCase()}. I read every inquiry myself and usually reply within 1–2 business days.`,
      "For reference, here's what you sent:",
      inq.message,
      "If you want to add anything, just reply to this email.",
    ],
    cta: { label: "Browse services", path: "/services" },
  };
}

type PaidRequest = {
  id: string;
  ref: number;
  contact_name: string;
  contact_email: string;
  service_title: string;
  package_name: string;
  final_price: number | string | null;
};

function amountLabel(value: number | string | null) {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  return n === null || !Number.isFinite(n) ? null : formatUSD(n);
}

/** To the client after PayPal checkout settles. */
export function paymentClientEmail(req: PaidRequest): EmailCopy {
  const amount = amountLabel(req.final_price);
  return {
    subject: `Payment received — ${req.service_title} (#${req.ref})`,
    lines: [
      `Hi ${req.contact_name},`,
      `Thank you! Your payment${amount ? ` of ${amount}` : ""} for ${req.service_title} — ${req.package_name} is confirmed, and I've started on your commission.`,
      "I'll post progress and any questions on your request page, and you'll get an email each time.",
    ],
    cta: { label: "View request", path: `/account/requests/${req.id}` },
  };
}

/** To the studio after PayPal checkout settles. */
export function paymentAdminEmail(req: PaidRequest): EmailCopy {
  const amount = amountLabel(req.final_price);
  return {
    subject: `Paid: #${req.ref} ${req.service_title}${amount ? ` (${amount})` : ""}`,
    lines: [
      `${req.contact_name} (${req.contact_email}) paid${amount ? ` ${amount}` : ""} through PayPal for ${req.service_title} — ${req.package_name}.`,
      "The request has moved to In progress.",
    ],
    cta: { label: "Open request", path: `/admin/requests/${req.id}` },
  };
}
