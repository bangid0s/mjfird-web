-- Link previews: the thumbnail, title, and description platforms show when
-- mjfird.com is pasted into X, WhatsApp, LinkedIn, Slack, iMessage, etc.
-- All of it is editable from /admin/settings.

alter table site_settings
  -- 'auto' renders the branded card at /opengraph-image; 'custom' serves an
  -- uploaded image as-is (1200×630 recommended).
  add column if not exists share_image_mode text not null default 'auto',
  add column if not exists share_image_url text,
  -- Copy shown next to the thumbnail. Blank falls back to site_title /
  -- site_description so the previous behaviour is preserved.
  add column if not exists share_title text not null default '',
  add column if not exists share_description text not null default '',
  -- Generated-card content. Blank eyebrow/headline fall back to hero_eyebrow
  -- and the wordmark (logo_text).
  add column if not exists share_card_eyebrow text not null default '',
  add column if not exists share_card_headline text not null default '',
  add column if not exists share_card_bg_url text,
  add column if not exists share_card_overlay_opacity int not null default 55,
  -- Used for twitter:site / twitter:creator, with or without the leading @.
  add column if not exists share_twitter_handle text not null default '';

alter table site_settings
  drop constraint if exists site_settings_share_image_mode_check;
alter table site_settings
  add constraint site_settings_share_image_mode_check
  check (share_image_mode in ('auto', 'custom'));

alter table site_settings
  drop constraint if exists site_settings_share_card_overlay_check;
alter table site_settings
  add constraint site_settings_share_card_overlay_check
  check (share_card_overlay_opacity between 0 and 100);
