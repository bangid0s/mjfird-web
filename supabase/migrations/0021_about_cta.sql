-- The button under the About page intro was hardcoded to "See the dance side"
-- pointing at /dance. Both are editable now; a blank label hides the button.

alter table site_settings
  add column if not exists about_cta_label text not null default 'See the dance side',
  add column if not exists about_cta_url text not null default '/dance';
