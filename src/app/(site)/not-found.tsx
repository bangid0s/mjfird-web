import MagneticButton from "@/components/ui/MagneticButton";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-6xl flex-col items-start justify-center gap-6 px-6 sm:px-10">
      <p className="font-mono text-label uppercase tracking-[0.25em] text-accent">404</p>
      <h1 className="font-display text-display-lg uppercase leading-[0.85] text-ink">
        Lost the beat
      </h1>
      <p className="max-w-md font-body text-body-lg text-ink-muted">
        Whatever you were looking for isn&apos;t on this floor. Let&apos;s get you back
        in the cypher.
      </p>
      <MagneticButton href="/" cursorLabel="view">
        Back to home →
      </MagneticButton>
    </div>
  );
}
