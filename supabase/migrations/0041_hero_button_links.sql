-- Hero buttons: the destination of each one is now editable in
-- /admin/pages/home, next to its text.
--
--   hero_cta_primary_url    main (filled) button. Blank = /services.
--                           A hero slide's own link still wins.
--   hero_cta_secondary_url  second (outlined) button. Blank = /work.
--
-- Values are cleaned in src/lib/hero-cta.ts (a site path, #anchor, http(s)
-- link or mailto:). Blank keeps today's behaviour, so nothing on the live
-- site changes until a link is saved. Additive and safe to run again.

alter table public.site_settings
  add column if not exists hero_cta_primary_url text not null default '',
  add column if not exists hero_cta_secondary_url text not null default '';
