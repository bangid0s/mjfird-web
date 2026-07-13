-- Animation style for the homepage hero background images.

alter table site_settings
  add column if not exists hero_animation text not null default 'none';

alter table site_settings
  drop constraint if exists site_settings_hero_animation_check;
alter table site_settings
  add constraint site_settings_hero_animation_check
  check (hero_animation in ('none', 'zoom', 'drift', 'pulse'));
