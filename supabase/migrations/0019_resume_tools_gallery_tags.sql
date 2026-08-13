-- Resume gains languages and a tools/software shelf; gallery images gain tags
-- so the page can filter by them.

-- ---------- resume: tools & software ----------
-- Its own table rather than a settings field because each tool carries an icon
-- image, and pasting those into a packed text field is miserable.
create table if not exists resume_tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon_url text,
  note text,
  sort_order int not null default 0,
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

create index if not exists resume_tools_status_idx on resume_tools (status, sort_order);

alter table resume_tools enable row level security;

create policy "public read published resume_tools" on resume_tools
  for select using (status = 'published');
create policy "admin all resume_tools" on resume_tools
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------- resume: languages ----------
-- [{ "name": "English", "level": "Professional" }] — level is optional.
alter table site_settings
  add column if not exists resume_languages jsonb not null default '[]'::jsonb;

-- ---------- gallery: tags ----------
alter table gallery_items
  add column if not exists tags text[] not null default '{}';
