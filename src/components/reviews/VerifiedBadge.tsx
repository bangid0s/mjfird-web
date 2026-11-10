/** Marks a review written by a real client from a completed order on this site. */
export default function VerifiedBadge({ serviceTitle }: { serviceTitle?: string }) {
  return (
    <span
      className="mono-meta inline-flex items-center gap-1.5 text-ink-muted"
      title="Written by a client after a completed commission ordered through this site"
    >
      <span aria-hidden="true" className="text-accent">✓</span>
      Verified commission{serviceTitle ? ` · ${serviceTitle}` : ""}
    </span>
  );
}
