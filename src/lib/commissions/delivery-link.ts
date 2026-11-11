/*
  Drop link for finished files: a Google Drive, Dropbox, WeTransfer, etc.
  folder the client opens from their request page. Any https host is allowed
  (unlike the PayPal link) because files live wherever the artist keeps them,
  but it must be a real public https URL. The same shape is enforced by the
  check constraint in supabase/migrations/0040_delivery_link_and_hero_cta.sql.
*/

const MAX_LENGTH = 2000;

export class DeliveryUrlError extends Error {
  constructor(message = "Use a full https:// link, e.g. a Google Drive or Dropbox folder.") {
    super(message);
    this.name = "DeliveryUrlError";
  }
}

/** Canonical https URL, or null when the field is empty. Throws on a rejected link. */
export function normalizeDeliveryUrl(input: string | null | undefined): string | null {
  if (input == null) return null;
  const raw = input.trim();
  if (raw === "") return null;
  if (raw.length > MAX_LENGTH) throw new DeliveryUrlError("That link is too long.");
  // Printable ASCII, no spaces: rejects control characters and lookalike hosts.
  if (!/^[\x21-\x7E]+$/.test(raw) || raw.includes("\\")) throw new DeliveryUrlError();
  if (raw.toLowerCase().slice(0, 8) !== "https://") throw new DeliveryUrlError();

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new DeliveryUrlError();
  }
  if (url.protocol !== "https:" || url.username || url.password) throw new DeliveryUrlError();
  const host = url.hostname.toLowerCase();
  // Needs a dotted public-looking name: no localhost, no bare IPs.
  if (!host.includes(".") || host.startsWith("[") || /^[0-9.]+$/.test(host)) throw new DeliveryUrlError();
  return url.toString();
}

/** Stored link if it still passes, otherwise nothing to render. */
export function safeDeliveryUrl(value: string | null | undefined): string | null {
  try {
    return normalizeDeliveryUrl(value);
  } catch {
    return null;
  }
}

/** "drive.google.com" from a stored link, for the button caption. */
export function deliveryHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
