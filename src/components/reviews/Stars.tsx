import { cn } from "@/lib/cn";

/** Read-only star rating. Screen readers hear "4 out of 5 stars". */
export default function Stars({ rating, className }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className={cn("inline-flex gap-0.5 text-accent", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} aria-hidden="true" className={i <= full ? "" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}
