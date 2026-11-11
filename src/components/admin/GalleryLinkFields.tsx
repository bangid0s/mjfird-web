import { fieldInputClasses } from "@/components/admin/Field";

export type ServiceOption = { id: string; title: string; live: boolean };
export type ReviewOption = {
  id: string;
  name: string;
  quote: string;
  rating: number | null;
  verified: boolean;
  /** Published — only these show on the public site. */
  live: boolean;
  serviceId: string | null;
};

function reviewLabel(r: ReviewOption) {
  const stars = r.rating ? `★${r.rating} · ` : "";
  const quote = r.quote.length > 48 ? `${r.quote.slice(0, 48)}…` : r.quote;
  const flags = [r.verified ? "verified" : null, r.live ? null : "not published"].filter(Boolean).join(", ");
  return `${stars}${r.name} — “${quote}”${flags ? ` (${flags})` : ""}`;
}

/**
 * The VGen-style extras for one gallery image: which services it is a sample
 * of, who it was for, and which review goes with it. Folded away by default so
 * the image list stays scannable; the summary line says what is set.
 */
export default function GalleryLinkFields({
  services,
  reviews,
  serviceIds = [],
  clientName = "",
  testimonialId = "",
}: {
  services: ServiceOption[];
  reviews: ReviewOption[];
  serviceIds?: string[];
  clientName?: string;
  testimonialId?: string;
}) {
  const linked = services.filter((s) => serviceIds.includes(s.id));
  const review = reviews.find((r) => r.id === testimonialId);
  const summary = [
    linked.length > 0 ? `Sample of ${linked.map((s) => s.title).join(", ")}` : "Not a service sample",
    clientName ? `for ${clientName}` : null,
    review ? (review.verified ? "verified review ✓" : "review") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Verified reviews first: those are the ones worth putting next to the art.
  const sortedReviews = [...reviews].sort((a, b) => Number(b.verified) - Number(a.verified));

  return (
    <details className="group col-span-full border border-line/70 bg-bg-raised/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-body-sm text-ink-muted [&::-webkit-details-marker]:hidden">
        <span className="truncate">{summary}</span>
        <span aria-hidden="true" className="font-mono text-ink-faint transition-transform group-open:rotate-45">
          +
        </span>
      </summary>

      <div className="flex flex-col gap-4 border-t border-line/70 p-3">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-label text-ink-muted">
            Sample of — shows on these service pages automatically
          </legend>
          {services.length === 0 ? (
            <p className="text-label text-ink-faint">No services yet. Create one under Services first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex cursor-pointer items-center gap-2 border border-line px-3 py-1.5 text-body-sm text-ink-muted has-[:checked]:border-accent has-[:checked]:text-ink"
                >
                  <input
                    type="checkbox"
                    name="service_ids"
                    value={service.id}
                    defaultChecked={serviceIds.includes(service.id)}
                    className="accent-[var(--color-accent)]"
                  />
                  {service.title}
                  {!service.live && <span className="text-label text-ink-faint">(draft)</span>}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
          <label className="flex flex-col gap-1">
            <span className="text-label text-ink-muted">Made for — client name (optional)</span>
            <input
              name="client_name"
              defaultValue={clientName}
              maxLength={80}
              placeholder="Blank uses the reviewer's name"
              className={fieldInputClasses}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label text-ink-muted">
              Client review — verified ones are from completed orders; only published reviews show
            </span>
            <select name="testimonial_id" defaultValue={testimonialId} className={fieldInputClasses}>
              <option value="">No review</option>
              {sortedReviews.map((r) => (
                <option key={r.id} value={r.id}>
                  {reviewLabel(r)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </details>
  );
}
