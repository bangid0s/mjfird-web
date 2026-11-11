"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { submitRequest } from "@/lib/client/request-actions";
import type { StorefrontService } from "@/lib/data/services";
import { clampExtraCharacters, effectiveAvailability, formatUSD, quote, type LicenseId, type ServiceQuestion } from "@/lib/services/storefront";
import CharacterStepper from "@/components/services/CharacterStepper";
import LicensePicker from "@/components/services/LicensePicker";
import BackgroundPicker from "@/components/services/BackgroundPicker";
import { choiceBox, choiceRadio, choiceTitle } from "@/components/services/choice";
import type { CommissionAnswer } from "@/lib/supabase/types";
import { authInput } from "@/components/auth/AuthForms";
import { cn } from "@/lib/cn";

type Uploaded = { path: string; name: string };

const MAX_BYTES = 20 * 1024 * 1024;

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "file";
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) : "";
  return ext ? `${base}.${ext}` : base;
}

/** Uploads straight to the private `commissions` bucket under the client's own folder. */
function FileDrop({
  userId,
  files,
  onChange,
  max = 10,
}: {
  userId: string;
  files: Uploaded[];
  onChange: (files: Uploaded[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (list: FileList) => {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const added: Uploaded[] = [];
    try {
      for (const file of Array.from(list).slice(0, max - files.length)) {
        if (file.size > MAX_BYTES) {
          setError(`${file.name} is over 20 MB.`);
          continue;
        }
        const path = `${userId}/refs/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName(file.name)}`;
        const { error: err } = await supabase.storage.from("commissions").upload(path, file, {
          contentType: file.type || "application/octet-stream",
        });
        if (err) {
          setError(`Couldn't upload ${file.name}: ${err.message}`);
          continue;
        }
        added.push({ path, name: file.name });
      }
      onChange([...files, ...added]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 border border-dashed border-line px-4 py-6 text-center transition-colors hover:border-ink-faint",
          busy && "opacity-60",
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        }}
      >
        <span className="text-body-sm text-ink">{busy ? "Uploading…" : "Drop images here, or click to browse"}</span>
        <span className="mono-meta">PNG, JPG, WEBP, PDF · up to 20 MB each · {max} max</span>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          disabled={busy || files.length >= max}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {error && <p className="text-body-sm text-error">{error}</p>}
      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-3 border border-line px-3 py-2 text-body-sm">
              <span className="truncate text-ink">{f.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((x) => x.path !== f.path))}
                className="spec text-ink-faint hover:text-error"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Question({
  q,
  value,
  onChange,
  userId,
  files,
  onFiles,
}: {
  q: ServiceQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  userId: string;
  files: Uploaded[];
  onFiles: (f: Uploaded[]) => void;
}) {
  const label = (
    <span className="flex flex-col gap-0.5">
      <span className="text-body font-medium text-ink">
        {q.label}
        {q.required && <span className="text-accent"> *</span>}
      </span>
      {q.help && <span className="text-body-sm text-ink-faint">{q.help}</span>}
    </span>
  );

  if (q.type === "file") {
    return (
      <div className="flex flex-col gap-3">
        {label}
        <FileDrop userId={userId} files={files} onChange={onFiles} max={10} />
      </div>
    );
  }
  if (q.type === "checkbox") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3">{label}</legend>
        {q.options.map((opt) => (
          <label key={opt} className="flex items-center gap-2.5 text-body-sm text-ink">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt])}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            {opt}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <label className="flex flex-col gap-3">
      {label}
      {q.type === "select" ? (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={q.required}
          className={authInput}
        >
          <option value="">Select one</option>
          {q.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : q.type === "long" ? (
        <textarea
          rows={4}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={q.required}
          className={cn(authInput, "resize-y")}
        />
      ) : (
        <input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={q.required}
          className={authInput}
        />
      )}
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="spec w-full bg-accent px-6 py-4 text-accent-ink transition-[filter] hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Sending…" : label}
    </button>
  );
}

export default function RequestForm({
  service,
  userId,
  defaultName,
  email,
  initialPackage,
  initialAddons,
  initialCharacters = 0,
  initialLicense = "personal",
  initialBackground,
}: {
  service: StorefrontService;
  userId: string;
  defaultName: string;
  email: string;
  initialPackage?: string;
  initialAddons: string[];
  initialCharacters?: number;
  initialLicense?: string;
  initialBackground?: string;
}) {
  const [state, action] = useActionState(submitRequest, undefined);
  const [packageId, setPackageId] = useState(
    service.packages.some((p) => p.id === initialPackage) ? initialPackage! : (service.packages[0]?.id ?? ""),
  );
  const [addonIds, setAddonIds] = useState(initialAddons.filter((id) => service.addons.some((a) => a.id === id)));
  const [extraCharacters, setExtraCharacters] = useState(initialCharacters);
  const [licenseId, setLicenseId] = useState<LicenseId>(
    service.licenses.some((l) => l.enabled && l.id === initialLicense) ? (initialLicense as LicenseId) : "personal",
  );
  const [backgroundId, setBackgroundId] = useState(
    service.backgrounds.some((b) => b.id === initialBackground) ? initialBackground! : (service.backgrounds[0]?.id ?? ""),
  );
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [questionFiles, setQuestionFiles] = useState<Record<string, Uploaded[]>>({});
  const [refs, setRefs] = useState<Uploaded[]>([]);

  const selected = service.packages.find((p) => p.id === packageId);
  const extra = clampExtraCharacters(selected, extraCharacters);
  const priced = quote(service.packages, service.addons, packageId, addonIds, extra, service.licenses, licenseId, service.backgrounds, backgroundId);
  const waitlist = effectiveAvailability(service.availability, service.slotsTotal, service.slotsTaken) === "waitlist";
  const hasFileQuestion = service.questions.some((q) => q.type === "file");

  const answerList: CommissionAnswer[] = service.questions
    .map((q) =>
      q.type === "file"
        ? { id: q.id, label: q.label, value: (questionFiles[q.id] ?? []).map((f) => f.name) }
        : { id: q.id, label: q.label, value: answers[q.id] ?? "" },
    )
    .filter((a) => (Array.isArray(a.value) ? a.value.length > 0 : a.value !== ""));
  const allPaths = [...refs, ...Object.values(questionFiles).flat()].map((f) => f.path);

  const missingFile = service.questions.find((q) => q.type === "file" && q.required && !(questionFiles[q.id]?.length));

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (missingFile) {
          e.preventDefault();
          alert(`Please upload: ${missingFile.label}`);
        }
      }}
      className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:gap-16"
    >
      <input type="hidden" name="service_id" value={service.id} />
      <input type="hidden" name="package_id" value={packageId} />
      {addonIds.map((id) => (
        <input key={id} type="hidden" name="addon_ids" value={id} />
      ))}
      <input type="hidden" name="extra_characters" value={extra} />
      <input type="hidden" name="background_id" value={priced?.backgroundId ?? ""} />
      <input type="hidden" name="license_id" value={priced?.licenseId ?? "personal"} />
      <input type="hidden" name="answers" value={JSON.stringify(answerList)} />
      <input type="hidden" name="reference_paths" value={JSON.stringify(allPaths)} />

      <div className="flex min-w-0 flex-col gap-10">
        {state?.error && (
          <p role="alert" className="border border-error/40 px-4 py-3 text-body-sm text-error">
            {state.error}
          </p>
        )}

        <section className="flex flex-col gap-5">
          <h2 className="eyebrow">You</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-body-sm font-medium text-ink">Name</span>
              <input name="contact_name" required defaultValue={defaultName} className={authInput} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-body-sm font-medium text-ink">Email</span>
              <input value={email} disabled className={authInput} />
            </label>
          </div>
        </section>

        <section className="flex flex-col gap-5 border-t border-line pt-8">
          <h2 className="eyebrow">The brief</h2>
          <label className="flex flex-col gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-body font-medium text-ink">
                What would you like? <span className="text-accent">*</span>
              </span>
              <span className="text-body-sm text-ink-faint">Characters, pose, mood, where it&apos;ll be used, any deadline.</span>
            </span>
            <textarea name="brief" rows={6} required minLength={10} maxLength={5000} className={cn(authInput, "resize-y")} />
          </label>

          {service.questions.map((q) => (
            <Question
              key={q.id}
              q={q}
              value={answers[q.id]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              userId={userId}
              files={questionFiles[q.id] ?? []}
              onFiles={(f) => setQuestionFiles((prev) => ({ ...prev, [q.id]: f }))}
            />
          ))}

          {!hasFileQuestion && (
            <div className="flex flex-col gap-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-medium text-ink">References</span>
                <span className="text-body-sm text-ink-faint">Character sheets, moodboards, anything that helps. Only you and I can see these.</span>
              </span>
              <FileDrop userId={userId} files={refs} onChange={setRefs} />
            </div>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:self-start">
        <div className="flex flex-col gap-6 border border-line bg-bg-raised/60 p-5 sm:p-6">
          <p className="eyebrow">Your order</p>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2.5 text-body-sm font-medium text-ink">Package</legend>
            {service.packages.map((pkg) => (
              <label key={pkg.id} className={choiceBox(pkg.id === packageId, "items-center justify-between gap-3 px-3.5 py-2.5")}>
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    checked={pkg.id === packageId}
                    onChange={() => setPackageId(pkg.id)}
                    className={choiceRadio(pkg.id === packageId)}
                  />
                  <span className={`text-body-sm ${choiceTitle(pkg.id === packageId)}`}>{pkg.name}</span>
                </span>
                <span className={`text-body-sm ${choiceTitle(pkg.id === packageId)}`}>{formatUSD(pkg.price)}</span>
              </label>
            ))}
          </fieldset>

          <CharacterStepper pkg={selected} value={extra} onChange={setExtraCharacters} />

          <BackgroundPicker
            backgrounds={service.backgrounds}
            value={priced?.backgroundId ?? null}
            onChange={setBackgroundId}
            name="background_choice"
          />

          {service.addons.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2.5 text-body-sm font-medium text-ink">Add-ons</legend>
              {service.addons.map((addon) => (
                <label key={addon.id} className="flex cursor-pointer items-center justify-between gap-3 py-0.5">
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={addonIds.includes(addon.id)}
                      onChange={() =>
                        setAddonIds((prev) => (prev.includes(addon.id) ? prev.filter((x) => x !== addon.id) : [...prev, addon.id]))
                      }
                      className="h-4 w-4 accent-[var(--color-accent)]"
                    />
                    <span className="text-body-sm text-ink">{addon.name}</span>
                  </span>
                  <span className="text-body-sm text-ink-muted">+{formatUSD(addon.price)}</span>
                </label>
              ))}
            </fieldset>
          )}

          <LicensePicker
            licenses={service.licenses}
            value={priced?.licenseId ?? "personal"}
            onChange={setLicenseId}
            base={priced ? priced.subtotal + priced.addonsTotal + priced.backgroundPrice : undefined}
            name="license_choice"
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

          <SubmitButton label={waitlist ? "Join the waitlist" : "Send request"} />
          <p className="text-[13px] leading-snug text-ink-faint">
            No payment now. I&apos;ll review your request and either accept it with a final price or reply with questions.
            {waitlist && " This service is on a waitlist — you'll be contacted when a slot opens."}
          </p>
        </div>
      </aside>
    </form>
  );
}
