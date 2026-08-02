// GA4 measurement IDs look like "G-XXXXXXXXXX"; a Google tag created in Tag
// Manager can also come as "GT-XXXXXXX". Anything else is a typo, and loading it
// would just 404 against Google's servers, so it is treated as "tracking off".
const GA_ID_PATTERN = /^(?:G|GT)-[A-Z0-9]{4,}$/;

export function normalizeGaId(raw: string) {
  return raw.trim().toUpperCase();
}

export function isValidGaId(raw: string) {
  return GA_ID_PATTERN.test(normalizeGaId(raw));
}
