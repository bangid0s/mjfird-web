-- Bento grid for /links: every button becomes a tile that can carry a feature
-- image and claim more of the grid than a plain row.

alter table link_page_items
  -- Any image address works — a pasted URL or an uploaded file's public URL.
  add column if not exists image_url text,
  -- Bento span on the two-column grid: small 1x1, wide 2x1, tall 1x2, large 2x2.
  add column if not exists size text not null default 'small';

alter table link_page_items
  drop constraint if exists link_page_items_size_check;
alter table link_page_items
  add constraint link_page_items_size_check
  check (size in ('small', 'wide', 'tall', 'large'));
