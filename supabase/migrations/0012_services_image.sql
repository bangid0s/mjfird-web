-- Optional card image for each service. Shown on the /services page only —
-- the homepage services section intentionally stays text-only.

alter table services
  add column if not exists image_url text;
