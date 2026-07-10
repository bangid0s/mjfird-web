-- Link-in-bio page (/links): custom buttons managed from the admin.

create table link_page_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  description text,
  emoji text,
  highlight boolean not null default false,
  sort_order int not null default 0,
  status content_status not null default 'published',
  created_at timestamptz not null default now()
);

alter table link_page_items enable row level security;

create policy "public read published link_page_items" on link_page_items
  for select using (status = 'published');
create policy "admin all link_page_items" on link_page_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
