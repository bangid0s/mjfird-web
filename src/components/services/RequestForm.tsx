"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { submitRequest } from "@/lib/client/request-actions";
import type { StorefrontService } from "@/lib/data/services";
import Link from "next/link";
import { effectiveAvailability, formatUSD, quote, type ServiceQuestion } from "@/lib/services/storefront";
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
  // The order is chosen on the service page and arrives in the URL; this form
  // only collects the brief, answers and references. quote() re-checks it all
  // (unknown ids dropped, counts clamped) and the database prices it again.
  const packageId = service.packages.some((p) => p.id === initialPackage) ? initialPackage! : (service.packages[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [questionFiles, setQuestionFiles] = useState<Record<string, Uploaded[]>>({});
  const [refs, setRefs] = useState<Uploaded[]>([]);

  const selected = service.packages.find((p) => p.id === packageId);
  const priced = quote(
    service.packages,
    service.addons,
    packageId,
    initialAddons,
    initialCharacters,
    service.licenses,
    initialLicense,
    service.backgrounds,
    initialBackground ?? "",
  );
  const extra = priced?.extraCharacters ?? 0;
  const addons = service.addons.filter((a) => priced?.addonIds.includes(a.id));
  const background = service.backgrounds.find((b) => b.id === priced?.backgroundId);
  const license = service.licenses.find((l) => l.id === priced?.licenseId);
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
      {(priced?.addonIds ?? []).map((id) => (
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

          {priced && selected ? (
            <dl className="flex flex-col gap-3 text-body-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink">{selected.name}</dt>
                <dd className="text-ink">{formatUSD(selected.price)}</dd>
              </div>
              {extra > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">
                    Extra characters: {extra} × {formatUSD(selected.price)}
                  </dt>
                  <dd className="text-ink">+{formatUSD(selected.price * extra)}</dd>
                </div>
              )}
              {background && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Background: {background.name}</dt>
                  <dd className="text-ink">{background.price > 0 ? `+${formatUSD(background.price)}` : "Included"}</dd>
                </div>
              )}
              {addons.map((a) => (
                <div key={a.id} className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{a.name}</dt>
                  <dd className="text-ink">+{formatUSD(a.price)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">
                  License: {license?.name ?? "Personal use"}
                  {priced.licensePercent > 0 && ` (+${priced.licensePercent}%)`}
                </dt>
                <dd className="text-ink">{priced.licenseFee > 0 ? `+${formatUSD(priced.licenseFee)}` : "Included"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-4">
                <dt className="text-ink-muted">Estimated total</dt>
                <dd className="display-sm">{formatUSD(priced.total)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-body-sm text-ink-muted">Pick a package on the service page first.</p>
          )}

          <Link href={`/services/${service.slug}`} className="spec self-start text-ink-muted hover:text-ink">
            ← Change order
          </Link>

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
