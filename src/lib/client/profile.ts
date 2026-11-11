import { z } from "zod";

/*
  What a client can fill in on /account/profile. Everything except the display
  name is optional. Handles are stored bare (no "@", no URL) so the admin view
  can link them; the extra social link must be a real http(s) URL. The
  database checks the same lengths (migration 0038).
*/

export const PROFILE_LIMITS = { displayName: 120, region: 80, discord: 40, x: 15, socialUrl: 300 } as const;

/** "@mjfird", "x.com/mjfird", "https://twitter.com/mjfird?s=1" → "mjfird". */
export function normalizeXHandle(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?(x|twitter)\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

/** Adds https:// when the client typed a bare domain. Empty stays empty. */
export function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export const clientProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Please enter a display name.")
    .max(PROFILE_LIMITS.displayName, "That display name is too long."),
  region: z.string().trim().max(PROFILE_LIMITS.region, "Keep the region under 80 characters."),
  discord: z
    .string()
    .transform((v) => v.trim().replace(/^@/, ""))
    .refine((v) => v === "" || /^[A-Za-z0-9_.#]{2,40}$/.test(v), "That Discord username doesn't look right."),
  x_handle: z
    .string()
    .transform(normalizeXHandle)
    .refine((v) => v === "" || /^[A-Za-z0-9_]{1,15}$/.test(v), "That X handle doesn't look right."),
  social_url: z
    .string()
    .transform(normalizeUrl)
    .refine((v) => {
      if (v === "") return true;
      if (v.length > PROFILE_LIMITS.socialUrl) return false;
      try {
        const u = new URL(v);
        return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
      } catch {
        return false;
      }
    }, "That link doesn't look right. Paste the full address, e.g. instagram.com/yourname."),
});

export type ClientProfileInput = z.infer<typeof clientProfileSchema>;

export function parseClientProfile(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "");
  return clientProfileSchema.safeParse({
    display_name: get("display_name"),
    region: get("region"),
    discord: get("discord"),
    x_handle: get("x_handle"),
    social_url: get("social_url"),
  });
}
