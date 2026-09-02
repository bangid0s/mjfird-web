-- Blog posts get the same media range projects already have: a gallery
-- alongside the cover, and control over how the cover is framed.
--
-- `cover_fit` mirrors the CSS it drives:
--   cover   — fill the frame, crop the overflow (the old, and still default,
--             behaviour); `cover_focal_point` decides what survives the crop
--   contain — whole image inside the frame, letterboxed, nothing cropped
--   natural — no frame at all: the cover keeps its own proportions, so a
--             portrait cover stays portrait on the card and on the post
--   stretch — fill the frame regardless of proportions (distorts)
--
-- `cover_aspect` is the cover's natural width ÷ height, measured in the admin
-- when the image is picked. It lets `natural` reserve the right box before the
-- image loads; 0 means unknown (older rows, or an image that failed to load),
-- and the renderer falls back to letting the image size itself.
alter table blog_posts
  add column if not exists cover_fit text not null default 'cover',
  add column if not exists cover_focal_point jsonb not null default '{"x": 0.5, "y": 0.5}'::jsonb,
  add column if not exists cover_aspect real not null default 0,
  add column if not exists gallery jsonb not null default '[]'::jsonb;

alter table blog_posts
  drop constraint if exists blog_posts_cover_fit_check;
alter table blog_posts
  add constraint blog_posts_cover_fit_check
  check (cover_fit in ('cover', 'contain', 'natural', 'stretch'));
