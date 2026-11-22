import { sendEmail } from "@/lib/email";
import { postStudioDiscord, type StudioEvent } from "@/lib/notifications/discord-studio";

/**
 * Tell the studio something happened: the email it always got, plus the same
 * alert in the private Discord channel when a webhook is set.
 */
export async function notifyStudio(
  event: StudioEvent,
  email: { to: string; subject: string; lines: string[]; cta?: { label: string; path: string }; replyTo?: string },
) {
  await Promise.all([
    sendEmail(email),
    postStudioDiscord(event, { subject: email.subject, lines: email.lines, ctaPath: email.cta?.path }),
  ]);
}
