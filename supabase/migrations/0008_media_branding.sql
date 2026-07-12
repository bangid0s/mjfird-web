-- Hero overlay strength, theme-specific logos, and custom favicon.

alter table site_settings
  add column if not exists hero_overlay_opacity int not null default 60,
  add column if not exists logo_url_light text,
  add column if not exists favicon_url text;

alter table site_settings
  drop constraint if exists site_settings_hero_overlay_opacity_check;
alter table site_settings
  add constraint site_settings_hero_overlay_opacity_check
  check (hero_overlay_opacity between 0 and 100);
