-- Custom background media + overlay for the /links (link-in-bio) page.

alter table site_settings
  add column if not exists links_bg_type text not null default 'none',
  add column if not exists links_bg_url text,
  add column if not exists links_overlay_opacity int not null default 70;

alter table site_settings
  drop constraint if exists site_settings_links_bg_type_check;
alter table site_settings
  add constraint site_settings_links_bg_type_check
  check (links_bg_type in ('none', 'image', 'video', 'youtube'));

alter table site_settings
  drop constraint if exists site_settings_links_overlay_opacity_check;
alter table site_settings
  add constraint site_settings_links_overlay_opacity_check
  check (links_overlay_opacity between 0 and 100);
