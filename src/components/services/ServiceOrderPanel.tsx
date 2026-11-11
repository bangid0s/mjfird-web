"use client";

import { useId, useState } from "react";
import MagneticButton from "@/components/ui/MagneticButton";
import AvailabilityBadge from "@/components/services/AvailabilityBadge";
import Stars from "@/components/reviews/Stars";
import CharacterStepper from "@/components/services/CharacterStepper";
import LicensePicker from "@/components/services/LicensePicker";
import BackgroundPicker from "@/components/services/BackgroundPicker";
import { choiceBox, choiceMuted, choiceRadio, choiceTitle } from "@/components/services/choice";
import type { StorefrontService } from "@/lib/data/services";
import { clampExtraCharacters, effectiveAvailability, formatUSD, quote, type LicenseId } from "@/lib/services/storefront";

/*
  Package + add-on picker with a live total. The total here is only a preview:
  whatever the client picks travels as ids, and the server re-prices it from the
  stored service before anything is quoted or charged.
*/
export default function ServiceOrderPanel({
  service,
  rating,
}: {
  service: StorefrontService;
  /** Published verified reviews for this service, if any. */
  rating?: { average: number; count: number };
}) {
  const [packageId, setPackageId] = useState(service.packages[0]?.id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [extraCharacters, setExtraCharacters] = useState(0);
  const [licenseId, setLicenseId] = useState<LicenseId>("personal");
  const [backgroundId, setBackgroundId] = useState(service.backgrounds[0]?.id ?? "");
  // The panel renders twice (mobile + desktop): each copy needs its own radio group.
  const group = useId();

  const status = effectiveAvailability(service.availability, service.slotsTotal, service.slotsTaken);
  const selected = service.packages.find((p) => p.id === packageId);
  // Switching to a package with a lower limit (or none) trims the count.
  const extra = clampExtraCharacters(selected, extraCharacters);
  const priced = quote(service.packages, service.addons, packageId, addonIds, extra, service.licenses, licenseId, service.backgrounds, backgroundId);

  const toggleAddon = (id: string) =>
    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const params = new URLSearchParams();
  if (packageId) params.set("package", packageId);
  if (addonIds.length) params.set("addons", addonIds.join(","));
  if (extra) params.set("characters", String(extra));
  // The first background is the default, so only a different pick goes in the link.
  if (priced?.backgroundId && priced.backgroundId !== service.backgrounds[0]?.id) params.set("background", priced.backgroundId);
  if (priced && priced.licenseId !== "personal") params.set("license", priced.licenseId);
  // No packages yet → nothing to price, so fall back to a plain inquiry.
  const requestHref = service.packages.length
    ? `/services/${service.slug}/request${params.size ? `?${params.toString()}` : ""}`
    : `/contact?service=${encodeURIComponent(service.slug)}`;

  return (
    <div className="flex flex-col gap-6 border border-line bg-bg-raised/60 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Request</p>
        <AvailabilityBadge
          availability={service.availability}
          slotsTotal={service.slotsTotal}
          slotsTaken={service.slotsTaken}
        />
      </div>

      {rating && (
        <a href="#reviews" className="-mt-2 flex items-center gap-2 text-body-sm text-ink-muted transition-colors hover:text-ink">
          <Stars rating={rating.average} />
          <span>
            {rating.average.toFixed(1)} · {rating.count} verified review{rating.count === 1 ? "" : "s"}
          </span>
        </a>
      )}

      {service.packages.length > 0 && (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-body-sm font-medium text-ink">Package</legend>
          {service.packages.map((pkg) => {
            const checked = pkg.id === packageId;
            return (
              <label key={pkg.id} className={choiceBox(checked, "flex-col gap-1 px-4 py-3")}>
                <span className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name={`package-${group}`}
                      value={pkg.id}
                      checked={checked}
                      onChange={() => setPackageId(pkg.id)}
                      className={choiceRadio(checked)}
                    />
                    <span className={`text-body font-medium ${choiceTitle(checked)}`}>{pkg.name}</span>
                  </span>
                  <span className={`text-body ${choiceTitle(checked)}`}>{formatUSD(pkg.price)}</span>
                </span>
                {pkg.description && <span className={`pl-[1.6rem] text-body-sm ${choiceMuted(checked)}`}>{pkg.description}</span>}
              </label>
            );
          })}
        </fieldset>
      )}

      {/* Right under the packages: the count belongs to the chosen package. */}
      <CharacterStepper pkg={selected} value={extra} onChange={setExtraCharacters} />

      {selected && (
        <dl className="grid grid-cols-2 gap-3 border-y border-line py-4">
          <div>
            <dt className="mono-meta">Delivery</dt>
            <dd className="text-body text-ink">{selected.delivery_days ? `${selected.delivery_days} days` : "Flexible"}</dd>
          </div>
          <div>
            <dt className="mono-meta">Revisions</dt>
            <dd className="text-body text-ink">{selected.revisions}</dd>
          </div>
          {selected.features.length > 0 && (
            <div className="col-span-2">
              <dt className="sr-only">Included</dt>
              <dd>
                <ul className="flex flex-col gap-1.5 pt-1">
                  {selected.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-body-sm text-ink-muted">
                      <span aria-hidden="true" className="mt-[0.55em] h-1 w-1 shrink-0 bg-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      )}

      <BackgroundPicker backgrounds={service.backgrounds} value={priced?.backgroundId ?? null} onChange={setBackgroundId} />

      {service.addons.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2.5 text-body-sm font-medium text-ink">Add-ons</legend>
          {service.addons.map((addon) => (
            <label key={addon.id} className="flex cursor-pointer items-start justify-between gap-3 py-1">
              <span className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={addonIds.includes(addon.id)}
                  onChange={() => toggleAddon(addon.id)}
                  className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                />
                <span className="flex flex-col">
                  <span className="text-body-sm text-ink">{addon.name}</span>
                  {addon.description && <span className="text-[13px] text-ink-faint">{addon.description}</span>}
                </span>
              </span>
              <span className="whitespace-nowrap text-body-sm text-ink-muted">+{formatUSD(addon.price)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <LicensePicker
        licenses={service.licenses}
        value={priced?.licenseId ?? "personal"}
        onChange={setLicenseId}
        base={priced ? priced.subtotal + priced.addonsTotal + priced.backgroundPrice : undefined}
      />

      {priced && priced.licenseFee > 0 && (
        <div className="-mb-3 flex items-baseline justify-between border-t border-line pt-4 text-body-sm text-ink-muted">
          <span>License (+{priced.licensePercent}%)</span>
          <span>+{formatUSD(priced.licenseFee)}</span>
        </div>
      )}

      {priced && (
        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-body-sm text-ink-muted">Estimated total</span>
          <span className="display-sm">{formatUSD(priced.total)}</span>
        </div>
      )}

      {status === "closed" ? (
        <p className="border border-line px-4 py-3 text-center text-body-sm text-ink-muted">
          Closed for new requests right now.
        </p>
      ) : (
        <MagneticButton href={requestHref} size="lg" arrow className="w-full justify-center">
          {status === "waitlist" ? "Join the waitlist" : "Request this service"}
        </MagneticButton>
      )}

      <p className="text-[13px] leading-snug text-ink-faint">
        No payment now. Sign in with Google or email to send a request — once I accept it, you&apos;ll pay in USD from your account.
      </p>
    </div>
  );
}
