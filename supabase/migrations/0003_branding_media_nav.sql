-- Branding, hero media, and editable navigation for site_settings.
-- Written with `if not exists` so it's safe whether or not 0002 was just run.

alter table site_settings
  add column if not exists logo_url text,
  add column if not exists hero_media_type text not null default 'none',
  add column if not exists hero_media_url text,
  add column if not exists nav_links jsonb not null default '[
    {"label": "Work", "href": "/work"},
    {"label": "Services", "href": "/services"},
    {"label": "About", "href": "/about"},
    {"label": "Dance", "href": "/dance"},
    {"label": "Blog", "href": "/blog"},
    {"label": "Contact", "href": "/contact"}
  ]'::jsonb;

alter table site_settings
  drop constraint if exists site_settings_hero_media_type_check;
alter table site_settings
  add constraint site_settings_hero_media_type_check
  check (hero_media_type in ('none', 'image', 'video'));
