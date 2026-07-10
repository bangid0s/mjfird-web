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
          className="flex items-center whitespace-nowrap font-display text-2xl uppercase tracking-tight text-ink-muted"
        >
          {item}
          <span className="px-10 text-accent">●</span>
        </span>
      ))}
    </div>
  );
}

export default function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="relative overflow-hidden border-y border-line bg-bg-raised py-5">
      <div className="animate-marquee flex w-max motion-reduce:animate-none">
        <MarqueeBlock items={items} />
        <MarqueeBlock items={items} ariaHidden />
      </div>
    </div>
  );
}
