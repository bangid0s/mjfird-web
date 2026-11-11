"use client";

import { useId } from "react";
import { formatUSD, offeredLicenses, type LicenseId, type ServiceLicense } from "@/lib/services/storefront";
import { choiceBox, choiceMuted, choiceRadio, choiceTitle } from "@/components/services/choice";

/*
  Usage license radio list (Personal use / Monetized content / Commercial
  merchandising). Personal use is the default. Each paid tier shows its
  surcharge as a percentage and, when a base total is known, in dollars.
*/
export default function LicensePicker({
  licenses,
  value,
  onChange,
  base,
  name,
}: {
  licenses: ServiceLicense[];
  value: LicenseId;
  onChange: (id: LicenseId) => void;
  /** Package × characters + add-ons, before the license. */
  base?: number;
  /** Radio group name; unique per instance by default (the panel can render twice). */
  name?: string;
}) {
  const autoName = `license-${useId()}`;
  const options = offeredLicenses(licenses);
  if (options.length <= 1) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2.5 text-body-sm font-medium text-ink">Usage license</legend>
      {options.map((lic) => {
        const checked = lic.id === value;
        const fee = base !== undefined ? Math.round(base * lic.percent) / 100 : null;
        return (
          <label key={lic.id} className={choiceBox(checked, "flex-col gap-1 px-4 py-3")}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name={name ?? autoName}
                  value={lic.id}
                  checked={checked}
                  onChange={() => onChange(lic.id)}
                  className={choiceRadio(checked)}
                />
                <span className={`text-body-sm font-medium ${choiceTitle(checked)}`}>{lic.name}</span>
              </span>
              <span className={`whitespace-nowrap text-body-sm ${choiceMuted(checked)}`}>
                {lic.percent === 0 ? "Included" : `+${lic.percent}%${fee !== null ? ` · ${formatUSD(fee)}` : ""}`}
              </span>
            </span>
            {lic.description && (
              <span className={`pl-[1.6rem] text-[13px] leading-snug ${choiceMuted(checked)}`}>{lic.description}</span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}
