import { createClient } from "@/lib/supabase/server";
import { createLinkItem } from "@/lib/admin/links-actions";
import { fieldInputClasses } from "@/components/admin/Field";
import LinkItemsList from "@/components/admin/LinkItemsList";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SubmitButton from "@/components/admin/SubmitButton";
import type { LinkItemRow } from "@/lib/supabase/types";

export default async function AdminLinksPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("link_page_items")
    .select("*")
    .order("sort_order", { ascending: true });

  const items = (data as LinkItemRow[]) ?? [];

  return (
    <div>
      <PageHeader
        title="Links page"
        description="The link-in-bio page at /links — drop that URL in your Instagram or TikTok bio. Name, avatar, and socials come from Profile; the accent color from Site Settings."
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

      <form
        action={createLinkItem}
        className="mb-10 grid grid-cols-2 items-end gap-3 border border-line p-4 lg:grid-cols-[3rem_1fr_1.4fr_1fr_auto_auto]"
      >
        <input name="emoji" placeholder="⚡" aria-label="Emoji" className={`${fieldInputClasses} text-center`} />
        <input name="label" required placeholder="Button label" aria-label="Label" className={fieldInputClasses} />
        <input name="url" required placeholder="https://… or /work" aria-label="URL" className={fieldInputClasses} />
        <input name="description" placeholder="Small sub-line (optional)" aria-label="Description" className={fieldInputClasses} />
        <label className="flex items-center gap-2 pb-3 font-mono text-label uppercase tracking-[0.1em] text-ink-muted">
          <input type="checkbox" name="highlight" className="h-4 w-4 accent-accent" />
          Accent
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
