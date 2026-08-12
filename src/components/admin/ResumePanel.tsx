import { updateResumePanel } from "@/lib/admin/resume-actions";
import { Field, fieldInputClasses } from "@/components/admin/Field";
import SubmitButton from "@/components/admin/SubmitButton";
import type { SiteSettings } from "@/lib/data/site-settings";

export default function ResumePanel({ settings }: { settings: SiteSettings }) {
  return (
    <form action={updateResumePanel} className="mb-12 flex flex-col gap-8 border border-line p-6">
      <div>
        <h2 className="font-mono text-label uppercase tracking-[0.2em] text-ink">Header</h2>
        <p className="mt-1 font-body text-label text-ink-muted">
          The block at the top of /resume. Your avatar and social links come from Profile.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name — blank uses your profile name">
          <input
            name="resume_headline"
            defaultValue={settings.resumeHeadline}
            placeholder="MJFIRD"
            className={fieldInputClasses}
          />
        </Field>
        <Field label="Role">
          <input
            name="resume_role"
            defaultValue={settings.resumeRole}
            placeholder="Designer, developer & breaker"
            className={fieldInputClasses}
          />
        </Field>
        <Field label="Location">
          <input
            name="resume_location"
            defaultValue={settings.resumeLocation}
            placeholder="Jakarta — working remotely"
            className={fieldInputClasses}
          />
        </Field>
        <Field label="Email — blank uses your contact email">
          <input
            type="email"
            name="resume_email"
            defaultValue={settings.resumeEmail}
            placeholder="hello@example.com"
            className={fieldInputClasses}
          />
        </Field>
      </div>

      <Field label="Summary — blank uses your profile bio">
        <textarea
          name="resume_summary"
          rows={3}
          defaultValue={settings.resumeSummary}
          placeholder="A short paragraph on what you do and who you do it for."
          className={`${fieldInputClasses} resize-none`}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Skills — one per line">
          <textarea
            name="resume_skills"
            rows={4}
            defaultValue={settings.resumeSkills.join("\n")}
            placeholder={"Brand identity\nArt direction\nNext.js"}
            className={`${fieldInputClasses} resize-none`}
          />
        </Field>
        <Field label="PDF link — shows a Download button when set">
          <input
            name="resume_pdf_url"
            defaultValue={settings.resumePdfUrl}
            placeholder="https://…/resume.pdf"
            className={fieldInputClasses}
          />
        </Field>
      </div>

      <SubmitButton className="self-start">Save header</SubmitButton>
    </form>
  );
}
