import MagneticButton from "@/components/ui/MagneticButton";

/**
 * Shared by both 404 boundaries: the one inside the site group (reached by a
 * `notFound()` call from a real route, e.g. an unknown project slug) and the
 * root one (reached by a URL that matches no route at all).
 */
export default function NotFoundContent() {
  return (
    <div className="container-page flex min-h-[70svh] flex-col items-start justify-center gap-6">
      <p className="eyebrow eyebrow-accent">404</p>
      <h1 className="display-xl">Lost the beat</h1>
      <p className="max-w-md text-body-lg text-pretty text-ink-muted">
        Whatever you were looking for isn&apos;t on this floor. Let&apos;s get you back
        in the cypher.
      </p>
      <MagneticButton href="/" size="lg" arrow cursorLabel="view">
        Back to home
      </MagneticButton>
    </div>
  );
}
