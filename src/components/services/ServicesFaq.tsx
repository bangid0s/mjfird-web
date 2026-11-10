/** General questions. Native disclosure: works without JavaScript and by keyboard. */
export default function ServicesFaq({ items }: { items: { q: string; a: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="border-t border-line">
      {items.map((item) => (
        <details key={item.q} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
            <span className="display-sm">{item.q}</span>
            <span aria-hidden="true" className="text-body-lg text-ink-muted transition-transform duration-[var(--duration-fast)] group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="max-w-2xl whitespace-pre-line pb-6 text-body text-pretty text-ink-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
