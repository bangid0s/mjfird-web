-- Each gallery image gets its own page at /gallery/<slug> (an indexable URL
-- for Google Images, and a page a client can be sent to: "this, please").
--
-- The slug is set once from the title and then left alone, so a renamed piece
-- keeps its address. The admin can still edit it by hand. Existing rows are
-- backfilled from their titles; repeats get -2, -3 in gallery order.

alter table public.gallery_items add column if not exists slug text;

with base as (
  select
    id,
    coalesce(
      nullif(trim(both '-' from regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', '-', 'g')), ''),
      'artwork'
    ) as base,
    sort_order,
    created_at
  from public.gallery_items
  where slug is null
),
ranked as (
  select id, base, row_number() over (partition by base order by sort_order, created_at, id) as n
  from base
)
update public.gallery_items g
set slug = case when r.n = 1 then r.base else r.base || '-' || r.n end
from ranked r
where g.id = r.id;

create unique index if not exists gallery_items_slug_key
  on public.gallery_items (slug)
  where slug is not null;
