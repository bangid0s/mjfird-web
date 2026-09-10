const REPS = 3;

function MarqueeBlock({ items, ariaHidden }: { items: string[]; ariaHidden?: boolean }) {
  // Items repeated so a single block always outruns the viewport width;
  // spacing lives inside each item (not container gap) so the loop seam
  // between the two blocks is identical to every other gap.
  const repeated = Array.from({ length: REPS }).flatMap(() => items);

  return (
    <div className="flex w-max shrink-0" aria-hidden={ariaHidden || undefined}>
      {repeated.map((item, i) => (
        <span
          key={i}
          className="flex items-center whitespace-nowrap font-display text-body-lg font-medium tracking-[-0.01em] text-ink-muted"
        >
          {item}
          <span aria-hidden="true" className="px-7 text-accent opacity-60">
            ✳
          </span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden border-y border-line bg-bg-raised/50 py-4"
      // Fade the strip out at both edges so it reads as continuous motion
      // rather than text being clipped by the viewport.
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div className="animate-marquee flex w-max motion-reduce:animate-none">
        <MarqueeBlock items={items} />
        <MarqueeBlock items={items} ariaHidden />
      </div>
    </div>
  );
}
