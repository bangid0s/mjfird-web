-- Logo as text-or-image choice, and YouTube as a hero background source.

alter table site_settings
  add column if not exists logo_type text not null default 'text',
  add column if not exists logo_text text not null default 'MJFIRD';

alter table site_settings
  drop constraint if exists site_settings_logo_type_check;
alter table site_settings
  add constraint site_settings_logo_type_check
  check (logo_type in ('text', 'image'));

-- Re-create the hero media check with 'youtube' allowed.
alter table site_settings
  drop constraint if exists site_settings_hero_media_type_check;
alter table site_settings
  add constraint site_settings_hero_media_type_check
  check (hero_media_type in ('none', 'image', 'video', 'youtube'));
