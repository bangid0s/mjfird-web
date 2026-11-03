/*
  Labels across the admin were written as "Name — what it's for", which used
  to render as one long line of spaced capitals. Splitting on the dash turns
  the first half into the label and the rest into a quieter hint underneath,
  without touching the hundred-odd call sites.
*/
function splitLabel(label: string): [string, string | null] {
  const at = label.indexOf(" — ");
  if (at === -1) return [label, null];
  const hint = label.slice(at + 3).trim();
  return [label.slice(0, at), hint ? hint.charAt(0).toUpperCase() + hint.slice(1) : null];
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  /** Overrides any hint parsed from the label. */
  hint?: string;
  children: React.ReactNode;
}) {
  const [text, parsedHint] = splitLabel(label);
  const help = hint ?? parsedHint;
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="flex flex-col gap-0.5">
        <span className="text-body-sm font-medium text-ink">{text}</span>
        {help && <span className="text-[13px] leading-snug text-ink-faint">{help}</span>}
      </span>
      {children}
    </label>
  );
}

/*
  A real box rather than an underline: textareas with only a bottom rule read
  as empty page, and the box gives hover and focus somewhere to show up.
*/
export const fieldInputClasses =
  "w-full border border-line bg-bg-raised px-3.5 py-2.5 font-body text-body text-ink shadow-[inset_0_1px_0_rgb(0_0_0/0.02)] transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] placeholder:text-ink-faint hover:border-line-strong focus:border-accent focus:bg-bg focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50";

/** A titled group of fields, for long forms. */
export function FieldSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-line pt-8 lg:grid-cols-[14rem_1fr] lg:gap-10">
      <div>
        <h2 className="text-body font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1.5 text-body-sm text-pretty text-ink-muted">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}
