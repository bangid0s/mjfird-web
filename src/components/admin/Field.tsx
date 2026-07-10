export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

export const fieldInputClasses =
  "w-full border-b border-line bg-transparent py-3 font-body text-body text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:opacity-50";
