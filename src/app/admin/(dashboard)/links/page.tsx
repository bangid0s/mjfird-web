import { createClient } from "@/lib/supabase/server";
import { createLinkItem } from "@/lib/admin/links-actions";
import { getSiteSettings } from "@/lib/data/site-settings";
import { fieldInputClasses } from "@/components/admin/Field";
import LinkItemsList, { SECTION_LIST_ID } from "@/components/admin/LinkItemsList";
import LinksStudioPanel from "@/components/admin/LinksStudioPanel";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SubmitButton from "@/components/admin/SubmitButton";
import type { LinkItemRow } from "@/lib/supabase/types";

export default async function AdminLinksPage() {
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    supabase.from("link_page_items").select("*").order("sort_order", { ascending: true }),
    getSiteSettings(),
  ]);

  const items = (data as LinkItemRow[]) ?? [];
  const sections = [
    ...new Set(items.map((item) => item.section?.trim()).filter((s): s is string => Boolean(s))),
  ];

  return (
    <div>
      <PageHeader
        title="Links page"
        description="The link-in-bio page at /links — drop that URL in your Instagram or TikTok bio. Buttons are grouped under their section heading and split across the Links and Shop tabs; Reviews come from Testimonials and About from Profile."
        action={
          <a
            href="/links"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-line px-5 py-2.5 font-mono text-label uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            Preview /links →
          </a>
        }
      />

      <LinksStudioPanel settings={settings} />

      <datalist id={SECTION_LIST_ID}>
        {sections.map((section) => (
          <option key={section} value={section} />
        ))}
      </datalist>

      <form
        action={createLinkItem}
        className="mb-10 grid grid-cols-2 items-end gap-3 border border-line p-4 lg:grid-cols-[3rem_1fr_1.3fr_1fr_6rem_8rem_auto_auto]"
      >
        <input name="emoji" placeholder="⚡" aria-label="Emoji" className={`${fieldInputClasses} text-center`} />
        <input name="label" required placeholder="Button label" aria-label="Label" className={fieldInputClasses} />
        <input name="url" required placeholder="https://… or /work" aria-label="URL" className={fieldInputClasses} />
        <input name="description" placeholder="Sub-line (optional)" aria-label="Description" className={fieldInputClasses} />
        <select name="tab" defaultValue="links" aria-label="Tab" className={fieldInputClasses}>
          <option value="links">Links</option>
          <option value="shop">Shop</option>
        </select>
        <input
          name="section"
          list={SECTION_LIST_ID}
          placeholder="Group heading"
          aria-label="Section"
          className={fieldInputClasses}
        />
        <label className="flex items-center gap-2 pb-3 font-mono text-label uppercase tracking-[0.1em] text-ink-muted">
          <input type="checkbox" name="highlight" className="h-4 w-4 accent-accent" />
          Ring
        </label>
        <SubmitButton pendingLabel="Adding…">Add link</SubmitButton>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No links yet"
          description="Add your first button above — reel, latest drop, booking form, merch, anything with a URL."
        />
      ) : (
        <LinkItemsList items={items} />
      )}
    </div>
  );
}
