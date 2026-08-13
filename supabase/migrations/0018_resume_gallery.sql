-- Two more standalone pages alongside /links: a resume at /resume and a
-- masonry gallery at /gallery. Both are driven from the admin.

-- ---------- resume entries ----------
-- One row per job, school or award. `bullets` is the detail list under the
-- entry; `summary` is the single line above it. Both are optional — a bare
-- role/organization/period row is a valid entry.
create table if not exists resume_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'experience',
  role text not null,
  organization text,
  period text,
  location text,
  summary text,
  bullets text[] not null default '{}',
  sort_order int not null default 0,
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

alter table resume_entries
  drop constraint if exists resume_entries_kind_check;
alter table resume_entries
  add constraint resume_entries_kind_check
  check (kind in ('experience', 'education', 'award'));

create index if not exists resume_entries_status_idx on resume_entries (status, sort_order);

alter table resume_entries enable row level security;

create policy "public read published resume_entries" on resume_entries
  for select using (status = 'published');
create policy "admin all resume_entries" on resume_entries
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- gallery items ----------
-- Masonry tiles. Height comes from the image's own aspect ratio, so nothing
-- here describes size; `link_url` is optional and makes the tile clickable.
create table if not exists gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  title text,
  caption text,
  link_url text,
  sort_order int not null default 0,
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

create index if not exists gallery_items_status_idx on gallery_items (status, sort_order);

alter table gallery_items enable row level security;

create policy "public read published gallery_items" on gallery_items
  for select using (status = 'published');
create policy "admin all gallery_items" on gallery_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- page chrome for both ----------
alter table site_settings
  -- /resume. Blank headline/summary fall back to the profile's name and bio.
  add column if not exists resume_headline text not null default '',
  add column if not exists resume_role text not null default '',
  add column if not exists resume_location text not null default '',
  add column if not exists resume_summary text not null default '',
  add column if not exists resume_email text not null default '',
  add column if not exists resume_skills text[] not null default '{}',
  add column if not exists resume_pdf_url text not null default '',
  -- /gallery
  add column if not exists gallery_headline text not null default '',
  add column if not exists gallery_intro text not null default '';
