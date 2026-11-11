"use client";

import type { ServicePackage } from "@/lib/services/storefront";
import { formatUSD } from "@/lib/services/storefront";

/*
  "Extra characters" counter for packages that allow more than one character
  (DnD party pieces, MTG art, custom emotes…). Starts at 0 = the one character
  the package includes; every +1 adds the package price again.
  Renders nothing when the package doesn't offer extra characters.
*/
export default function CharacterStepper({
  pkg,
  value,
  onChange,
}: {
  pkg: ServicePackage | undefined;
  value: number;
  onChange: (next: number) => void;
}) {
  if (!pkg || pkg.extra_characters_max <= 0) return null;
  const max = pkg.extra_characters_max;
  const btn =
    "flex h-9 w-9 items-center justify-center border border-line text-body text-ink transition-colors duration-[var(--duration-fast)] hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2.5 text-body-sm font-medium text-ink">Extra characters</legend>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center">
          <button
            type="button"
            className={btn}
            onClick={() => onChange(Math.max(0, value - 1))}
            disabled={value <= 0}
            aria-label="Remove a character"
          >
            −
          </button>
          <output aria-live="polite" className="flex h-9 min-w-12 items-center justify-center border-y border-line px-2 text-body text-ink">
            {value}
          </output>
          <button
            type="button"
            className={btn}
            onClick={() => onChange(Math.min(max, value + 1))}
            disabled={value >= max}
            aria-label="Add a character"
          >
            +
          </button>
        </div>
        <span className="whitespace-nowrap text-body-sm text-ink-muted">+{formatUSD(pkg.price)} each</span>
      </div>
      <p className="text-[13px] leading-snug text-ink-faint">
        {value === 0
          ? `1 character included. Add up to ${max} more.`
          : `${value + 1} characters in total — ${value} extra × ${formatUSD(pkg.price)}.`}
      </p>
    </fieldset>
  );
}
