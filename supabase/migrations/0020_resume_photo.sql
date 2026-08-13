-- A portrait for /resume that is independent of the profile avatar used on the
-- rest of the site. Blank falls back to that avatar, so nothing changes until
-- a resume-specific photo is set.

alter table site_settings
  add column if not exists resume_photo_url text not null default '';
