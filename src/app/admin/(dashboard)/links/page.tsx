import { createClient } from "@/lib/supabase/server";
import { createLinkItem } from "@/lib/admin/links-actions";
import { getSiteSettings } from "@/lib/data/site-settings";
import { fieldInputClasses } from "@/components/admin/Field";
import LinkItemsList, { SECTION_LIST_ID } from "@/components/admin/LinkItemsList";
import LinksStudioPanel from "@/components/admin/LinksStudioPanel";
import LinksBgPicker from "@/components/admin/LinksBgPicker";
import { saveSiteSettings } from "@/lib/admin/site-settings-actions";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import SubmitButton from "@/components/admin/SubmitButton";
import UploadInput from "@/components/admin/UploadInput";
import { LINK_TILE_SIZES } from "@/lib/link-tiles";
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
        description="The link-in-bio page at /links: drop that URL in your Instagram or TikTok bio. Every link is a tile. Paste an image address to give it a photo and pick a size to make it larger; tiles grow to close any gap. Links that share a group heading sit together under that heading. Give a link the Shop tab to split it out; the tab bar only appears once something is in Shop."
        action={
          <a
            href="/links"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-line px-5 py-2.5 text-body-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            Preview /links →
          </a>
        }
      />

      <LinksStudioPanel settings={settings} />

      <form
        action={saveSiteSettings.bind(null, "links-background")}
        className="mb-12 flex flex-col gap-6 border border-line p-6"
      >
        <div>
          <h2 className="text-body font-semibold text-ink">Page background</h2>
          <p className="mt-1 text-label text-ink-muted">
            The image or video behind the /links window. A YouTube background plays on tablets and desktops;
            phones get its still frame, since the window covers the screen there.
          </p>
        </div>
        <LinksBgPicker
          initialType={settings.linksBgType}
          initialUrl={settings.linksBgUrl}
          initialOverlay={settings.linksOverlayOpacity}
        />
        <div>
          <SubmitButton>Save background</SubmitButton>
        </div>
      </form>

      <datalist id={SECTION_LIST_ID}>
        {sections.map((section) => (
          <option key={section} value={section} />
        ))}
      </datalist>

      <form action={createLinkItem} className="mb-10 flex flex-col gap-3 border border-line p-4">
        <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[3rem_1fr_1.3fr_1fr]">
          <input name="emoji" placeholder="⚡" aria-label="Emoji" className={`${fieldInputClasses} text-center`} />
          <input name="label" required placeholder="Button label" aria-label="Label" className={fieldInputClasses} />
          <input name="url" required placeholder="https://… or /work" aria-label="URL" className={fieldInputClasses} />
          <input name="description" placeholder="Sub-line (optional)" aria-label="Description" className={fieldInputClasses} />
        </div>

        <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[1.4fr_7rem_6rem_8rem_auto_auto]">
          <UploadInput name="image_url" ariaLabel="Tile image" placeholder="Paste an image address…" />
          <select name="size" defaultValue="small" aria-label="Tile size" className={fieldInputClasses}>
            {LINK_TILE_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
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
          <label className="flex items-center gap-2 pb-3 text-body-sm font-medium text-ink-muted">
            <input type="checkbox" name="highlight" className="h-4 w-4 accent-accent" />
            Ring
          </label>
          <SubmitButton pendingLabel="Adding…">Add link</SubmitButton>
        </div>
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
