import { saveSiteSettings } from "@/lib/admin/site-settings-actions";
import type { SettingsSection } from "@/lib/admin/site-settings-sections";
import SubmitButton, { FormActions } from "@/components/admin/SubmitButton";

/**
 * The frame every settings screen shares: the result of the last save, the
 * form bound to that screen's share of the settings, and the pinned save row.
 */
export default function SettingsForm({
  section,
  status,
  saveLabel = "Save changes",
  children,
}: {
  section: SettingsSection;
  status: { saved?: string; error?: string; pending?: string };
  saveLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {status.saved && !status.pending && (
        <p role="status" className="mb-8 border border-success px-4 py-3 text-body-sm font-medium text-success">
          Saved. The live site is updated.
        </p>
      )}
      {status.pending && (
        <p role="status" className="mb-8 border border-line-strong px-4 py-3 text-body-sm text-ink">
          Saved, except fields that need a newer database migration (hero headline, proof note,
          FAQ, retainer, hero button links). Run the latest files in supabase/migrations
          (0034 and 0041) against your project, then save again.
        </p>
      )}
      {status.error && (
        <p role="alert" className="mb-8 border border-error px-4 py-3 text-body-sm text-error">
          Not saved: {status.error}. If this mentions a missing column, run the latest file in
          supabase/migrations against your project.
        </p>
      )}

      {/* The page header already draws a rule, so the first section drops its own. */}
      <form
        action={saveSiteSettings.bind(null, section)}
        className="flex flex-col gap-10 [&>section:first-of-type]:border-t-0 [&>section:first-of-type]:pt-0"
      >
        {children}
        <FormActions>
          <SubmitButton>{saveLabel}</SubmitButton>
        </FormActions>
      </form>
    </>
  );
}

/** The "open this page on the live site" link in a settings screen's header. */
export function ViewPageLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 border border-line px-4 py-2.5 text-body-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      View {href === "/" ? "homepage" : href}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
