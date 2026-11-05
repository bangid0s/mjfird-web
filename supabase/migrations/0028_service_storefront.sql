-- VGen-style commission storefront: each service gets its own page with
-- packages (tiers), add-ons, sample gallery, FAQ, terms, a custom request
-- form, and an availability / slot status. All prices are USD.
--
-- The repeating structures live in jsonb so the admin can edit them as one
-- form; the app validates their shape (src/lib/services/storefront.ts) and
-- always prices orders on the server from these rows, never from the client.

alter table services
  add column if not exists slug text,
  add column if not exists category text not null default '',
  add column if not exists details text not null default '',
  add column if not exists availability text not null default 'open'
    check (availability in ('open', 'waitlist', 'closed')),
  add column if not exists slots_total int check (slots_total is null or slots_total >= 0),
  add column if not exists slots_taken int not null default 0 check (slots_taken >= 0),
  -- [{ id, name, description, price, delivery_days, revisions, features: [] }]
  add column if not exists packages jsonb not null default '[]'::jsonb,
  -- [{ id, name, description, price }]
  add column if not exists addons jsonb not null default '[]'::jsonb,
  -- [{ url, alt }]  (same shape as projects.gallery)
  add column if not exists samples jsonb not null default '[]'::jsonb,
  add column if not exists will_draw text[] not null default '{}',
  add column if not exists wont_draw text[] not null default '{}',
  -- [{ q, a }]
  add column if not exists faq jsonb not null default '[]'::jsonb,
  add column if not exists terms text not null default '',
  -- [{ id, label, type: 'short'|'long'|'select'|'checkbox'|'file', options: [], required, help }]
  add column if not exists questions jsonb not null default '[]'::jsonb;

-- Backfill slugs for existing services from their titles.
update services
set slug = trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

-- Disambiguate any duplicate slugs produced by the backfill.
with ranked as (
  select id, slug, row_number() over (partition by slug order by created_at) as n
  from services
)
update services s
set slug = ranked.slug || '-' || ranked.n
from ranked
where s.id = ranked.id and ranked.n > 1;

alter table services alter column slug set not null;
create unique index if not exists services_slug_key on services (slug);
