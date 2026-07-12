-- Hero image slideshow, dance page copy, and about description.

alter table site_settings
  add column if not exists hero_media_urls jsonb not null default '[]'::jsonb,
  add column if not exists dance_section_eyebrow text not null default 'Dance',
  add column if not exists dance_section_title text not null default 'The other half',
  add column if not exists dance_intro text not null default 'Breaking is where the design taste comes from. Here''s the reel, the footage, and the battle record.',
  add column if not exists about_description text not null default '';
