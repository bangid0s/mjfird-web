import { GoogleAnalytics } from "@next/third-parties/google";
import { isValidGaId, normalizeGaId } from "@/lib/analytics";

// Mounted on the public pages only — /admin is left out so the owner's own
// sessions never show up in the reports. GA4's enhanced measurement picks up
// client-side navigations from the History API, so no per-route wiring is needed.
export default function Analytics({ measurementId }: { measurementId: string }) {
  // Local development would otherwise report against the live property.
  if (process.env.NODE_ENV === "development") return null;
  if (!isValidGaId(measurementId)) return null;

  return <GoogleAnalytics gaId={normalizeGaId(measurementId)} />;
}
