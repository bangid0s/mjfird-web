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
  "w-full border-b border-line bg-transparent py-3 font-body text-body text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:opacity-50";

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
      <div className="border border-accent px-6 py-10 text-center">
        <p className="font-display text-display-sm uppercase text-ink">Message sent</p>
        <p className="mt-3 font-body text-body-sm text-ink-muted">
          Got it — I&apos;ll get back to you within a couple of days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Name" error={errors.name}>
          <input name="name" type="text" placeholder="Your name" className={inputClasses} disabled={state === "loading"} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input name="email" type="email" placeholder="you@studio.com" className={inputClasses} disabled={state === "loading"} />
        </Field>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <Field label="Project type" error={errors.projectType}>
          <select name="projectType" defaultValue="" className={cn(inputClasses, "appearance-none")} disabled={state === "loading"}>
            <option value="" disabled>
              Select one
            </option>
            <option value="brand">Brand / identity</option>
            <option value="web">Web design & build</option>
            <option value="motion">Motion / interaction</option>
            <option value="other">Something else</option>
          </select>
        </Field>
        <Field label="Budget range" error={errors.budget}>
          <select name="budget" defaultValue="" className={cn(inputClasses, "appearance-none")} disabled={state === "loading"}>
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
          rows={5}
          placeholder="What are you building, and what's the timeline?"
          className={cn(inputClasses, "resize-none")}
          disabled={state === "loading"}
        />
      </Field>

      {state === "error" && (
        <p className="font-mono text-label text-error">
          Something went wrong on our end — try again, or email hello@mjfird.com directly.
        </p>
      )}

      <MagneticButton type="submit" cursorLabel="view" className={state === "loading" ? "opacity-60" : undefined}>
        {state === "loading" ? "Sending…" : "Send inquiry →"}
      </MagneticButton>
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
      <span className="font-mono text-label uppercase tracking-[0.15em] text-ink-muted">{label}</span>
      {children}
      {error && <span className="font-mono text-label text-error">{error}</span>}
    </label>
  );
}
