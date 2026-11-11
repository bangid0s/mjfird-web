-- Home page hero: which hero the page shows.
--
--   hero_style  'wall'    the art wall, filled from the gallery images filed
--                         under published services (the default)
--               'slider'  the previous hero: the slides, image or video set
--                         in /admin/pages/home
--
-- The site reads a missing or unknown value as 'wall', so the code runs before
-- this is applied; until then the choice just can't be saved. Additive and
-- safe to run again.

alter table public.site_settings
  add column if not exists hero_style text not null default 'wall';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'site_settings_hero_style_check'
  ) then
    alter table public.site_settings
      add constraint site_settings_hero_style_check check (hero_style in ('wall', 'slider'));
  end if;
end $$;
