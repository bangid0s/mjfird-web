-- How long each homepage hero image stays on screen before the slider
-- auto-advances, in seconds. Only relevant when 2+ hero images are set.

alter table site_settings
  add column if not exists hero_slide_duration int not null default 5;

alter table site_settings
  drop constraint if exists site_settings_hero_slide_duration_check;
alter table site_settings
  add constraint site_settings_hero_slide_duration_check
  check (hero_slide_duration between 1 and 30);
