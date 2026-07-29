-- Links page "studio terminal" UI: grouped/tabbed link buttons, studio opening
-- hours with a live clock, and a partner/brand strip.

-- Link buttons gain a tab ("Links" or "Shop") and an optional section heading
-- so they can be grouped under labels like "GRAPHICS NEED" / "COLLABORATION".
alter table link_page_items
  add column if not exists tab text not null default 'links',
  add column if not exists section text;

alter table link_page_items
  drop constraint if exists link_page_items_tab_check;
alter table link_page_items
  add constraint link_page_items_tab_check check (tab in ('links', 'shop'));

alter table site_settings
  -- Identity block at the top of the window.
  add column if not exists links_window_title text not null default '// Welcome to',
  add column if not exists links_headline text not null default '',
  add column if not exists links_run_by text not null default '',
  add column if not exists links_intro text not null default '',
  add column if not exists links_cta_label text not null default 'Contact Now',
  add column if not exists links_cta_url text not null default '/contact',
  -- Opening hours. Times are "HH:MM" wall-clock in links_timezone; open_days is
  -- a comma-separated list of weekday numbers, 0 = Sunday.
  add column if not exists links_show_status boolean not null default true,
  add column if not exists links_timezone text not null default 'Asia/Jakarta',
  add column if not exists links_open_time text not null default '09:00',
  add column if not exists links_close_time text not null default '17:00',
  add column if not exists links_open_days text not null default '1,2,3,4,5',
  -- Partner / affiliate strip. Empty slots render as "+ Your Brand here".
  add column if not exists links_brands jsonb not null default '[]'::jsonb,
  add column if not exists links_brand_slots int not null default 3,
  add column if not exists links_brand_cta_url text not null default '',
  -- Chips under the link list.
  add column if not exists links_tags text[] not null default '{}';

alter table site_settings
  drop constraint if exists site_settings_links_brand_slots_check;
alter table site_settings
  add constraint site_settings_links_brand_slots_check
  check (links_brand_slots between 0 and 6);
