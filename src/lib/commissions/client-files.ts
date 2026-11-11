/*
  Paths in the private `commissions` bucket:
    <client uid>/refs/<stamp>-<rand>-<name>                      (client references)
    <client uid>/deliveries/<request id>/<stamp>-<rand>-<name>   (finished files)
  The <stamp>-<rand>- prefix keeps uploads unique; people only ever see <name>.
*/

const UNIQUE_PREFIX = /^(\d+-[a-z0-9]+-)/;

export type ClientFileKind = "reference" | "delivery" | "other";

export function parseClientFilePath(path: string): {
  clientId: string;
  kind: ClientFileKind;
  requestId: string | null;
  folder: string;
  file: string;
} {
  const parts = path.split("/");
  const file = parts.pop() ?? "";
  const folder = parts.join("/");
  const [clientId = "", area, requestId] = parts;
  if (area === "refs" && parts.length === 2) return { clientId, kind: "reference", requestId: null, folder, file };
  if (area === "deliveries" && parts.length === 3) return { clientId, kind: "delivery", requestId: requestId ?? null, folder, file };
  return { clientId, kind: "other", requestId: null, folder, file };
}

/** The name a person sees: the file part without the upload's unique prefix. */
export function clientFileName(path: string) {
  const file = path.split("/").pop() ?? path;
  return file.replace(UNIQUE_PREFIX, "") || file;
}

/** Same character set the uploaders use, so keys stay URL-safe. */
export function sanitizeClientFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 120);
}

/**
 * The new key for a rename: same folder, same unique prefix (so two clients'
 * "sketch.png" never collide), new visible name. Null when nothing changes or
 * the name is unusable.
 */
export function renamedClientFilePath(path: string, nextName: string): string | null {
  const clean = sanitizeClientFileName(nextName);
  if (!clean || clean.includes("..")) return null;
  const { folder, file } = parseClientFilePath(path);
  const prefix = file.match(UNIQUE_PREFIX)?.[1] ?? "";
  const next = `${folder ? `${folder}/` : ""}${prefix}${clean}`;
  return next === path ? null : next;
}

/** Guard for paths coming back from the browser into a server action. */
export function isSafeClientFilePath(path: string) {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.length <= 400 &&
    !path.startsWith("/") &&
    !path.split("/").some((part) => part === "" || part === "." || part === "..")
  );
}
