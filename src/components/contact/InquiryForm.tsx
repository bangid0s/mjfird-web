"use client";

import { useState } from "react";
import { z } from "zod";
import MagneticButton from "@/components/ui/MagneticButton";
import { cn } from "@/lib/cn";

const schema = z.object({
  name: z.string().min(1, "Tell us your name."),
  email: z.string().email("That email doesn't look right."),
  projectType: z.string().min(1, "Pick what this is about."),
  budget: z.string().min(1, "Pick a rough budget range."),
  message: z.string().min(20, "Give us at least a couple sentences."),
  company: z.string().max(0, "").optional(), // honeypot
});

type FormState = "idle" | "loading" | "success" | "error";
type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

const inputClasses =
  "w-full border border-line bg-bg-raised px-4 py-3.5 text-body text-ink transition-colors duration-[var(--duration-fast)] placeholder:text-ink-faint focus:border-ink focus:outline-none disabled:opacity-50";

// Native selects need their own arrow back once appearance is stripped.
const selectClasses = cn(
  inputClasses,
  "appearance-none bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-11",
);

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237e7e89' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

export default function InquiryForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<Errors>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const values = Object.fromEntries(formData.entries());

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setState("loading");

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error("Request failed");
      setState("success");
    } catch {
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="border border-line flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center bg-accent text-accent-ink">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <p className="display-sm mt-1">Message sent</p>
        <p className="max-w-sm text-body-sm text-ink-muted">
          Got it — I&apos;ll get back to you within a couple of days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" error={errors.name}>
          <input
            name="name"
            type="text"
            placeholder="Your name"
            className={inputClasses}
            disabled={state === "loading"}
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <input
            name="email"
            type="email"
            placeholder="you@studio.com"
            className={inputClasses}
            disabled={state === "loading"}
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Project type" error={errors.projectType}>
          <select
            name="projectType"
            defaultValue=""
            className={selectClasses}
            style={{ backgroundImage: CHEVRON }}
            disabled={state === "loading"}
          >
            <option value="" disabled>
              Select one
            </option>
            <option value="brand">Brand / identity</option>
            <option value="web">Web design &amp; build</option>
            <option value="motion">Motion / interaction</option>
            <option value="other">Something else</option>
          </select>
        </Field>
        <Field label="Budget range" error={errors.budget}>
          <select
            name="budget"
            defaultValue=""
            className={selectClasses}
            style={{ backgroundImage: CHEVRON }}
            disabled={state === "loading"}
          >
            <option value="" disabled>
              Select one
            </option>
            <option value="<5k">Under $5k</option>
            <option value="5-10k">$5k – $10k</option>
            <option value="10-25k">$10k – $25k</option>
            <option value="25k+">$25k+</option>
          </select>
        </Field>
      </div>

      <Field label="Tell me about the project" error={errors.message}>
        <textarea
          name="message"
          rows={6}
          placeholder="What are you building, and what's the timeline?"
          className={cn(inputClasses, "resize-none")}
          disabled={state === "loading"}
        />
      </Field>

      {state === "error" && (
        <p className="border border-error/50 px-4 py-3 text-body-sm text-error">
          Something went wrong on our end — try again, or email hello@mjfird.com directly.
        </p>
      )}

      <div className="mt-2">
        <MagneticButton
          type="submit"
          size="lg"
          arrow={state !== "loading"}
          cursorLabel="view"
          className={state === "loading" ? "opacity-60" : undefined}
        >
          {state === "loading" ? "Sending…" : "Send inquiry"}
        </MagneticButton>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="spec">{label}</span>
      {children}
      {error && <span className="spec text-error">{error}</span>}
    </label>
  );
}
