"use client";

import { useId } from "react";
import { formatUSD, type ServiceBackground } from "@/lib/services/storefront";
import { choiceBox, choiceMuted, choiceRadio, choiceTitle } from "@/components/services/choice";

/*
  Background radio list (e.g. No background / Simple / Detailed scene). The
  client picks exactly one; the first option is the default. Hidden when the
  service offers no background choice.
*/
export default function BackgroundPicker({
  backgrounds,
  value,
  onChange,
  name,
}: {
  backgrounds: ServiceBackground[];
  value: string | null;
  onChange: (id: string) => void;
  /** Radio group name; unique per instance by default (the panel can render twice). */
  name?: string;
}) {
  const autoName = `background-${useId()}`;
  if (backgrounds.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2.5 text-body-sm font-medium text-ink">Background</legend>
      {backgrounds.map((bg) => {
        const checked = bg.id === value;
        return (
          <label key={bg.id} className={choiceBox(checked, "flex-col gap-1 px-4 py-3")}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name={name ?? autoName}
                  value={bg.id}
                  checked={checked}
                  onChange={() => onChange(bg.id)}
                  className={choiceRadio(checked)}
                />
                <span className={`text-body-sm font-medium ${choiceTitle(checked)}`}>{bg.name}</span>
              </span>
              <span className={`whitespace-nowrap text-body-sm ${choiceMuted(checked)}`}>
                {bg.price === 0 ? "Included" : `+${formatUSD(bg.price)}`}
              </span>
            </span>
            {bg.description && (
              <span className={`pl-[1.6rem] text-[13px] leading-snug ${choiceMuted(checked)}`}>{bg.description}</span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
