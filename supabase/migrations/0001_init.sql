-- MJFIRD schema: projects, services, blog, testimonials, dance, inquiries, profile.
-- Single-admin model: any authenticated Supabase Auth user is treated as the
-- site owner (admin accounts are created manually in the Supabase dashboard,
-- there is no public sign-up), so RLS just gates on auth.role() = 'authenticated'.

create extension if not exists "pgcrypto";

create type content_status as enum ('draft', 'scheduled', 'published');
create type case_study_template as enum ('editorial', 'immersive', 'systems');
create type inquiry_status as enum ('new', 'read', 'archived');

-- ---------- profile (single row) ----------
create table profile (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'MJFIRD',
  tagline text,
  bio text,
  avatar_url text,
  resume_url text,
  availability_status text default 'Open for work',
  socials jsonb not null default '[]'::jsonb, -- [{ "label": "Instagram", "url": "..." }]
  updated_at timestamptz not null default now()
);

-- ---------- projects ----------
create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  client text,
  year text,
  role text,
  category text,
  hook text,
  template case_study_template not null default 'editorial',
  cover_image text,
  cover_focal_point jsonb default '{"x": 0.5, "y": 0.5}'::jsonb,
  gallery jsonb not null default '[]'::jsonb, -- [{ url, alt, focal_point }]
  narrative jsonb not null default '{}'::jsonb, -- { context, move, build, result }
  featured boolean not null default false,
  sort_order int not null default 0,
  status content_status not null default 'draft',
  published_at timestamptz,
  scheduled_at timestamptz,
  seo_description text,
  og_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_status_idx on projects (status, sort_order);
create index projects_featured_idx on projects (featured) where featured = true;

-- ---------- services ----------
create table services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  deliverables text[] not null default '{}',
  sort_order int not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- testimonials ----------
create table testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  name text not null,
  role text,
  avatar_url text,
  sort_order int not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- ---------- blog posts ----------
create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body jsonb not null default '[]'::jsonb, -- array of block objects
  cover_image text,
  tags text[] not null default '{}',
  read_time text,
  status content_status not null default 'draft',
  published_at timestamptz,
  scheduled_at timestamptz,
  seo_description text,
  og_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_posts_status_idx on blog_posts (status, published_at desc);

-- ---------- dance: media + battle record ----------
create table dance_media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('video', 'photo')),
  url text not null,
  caption text,
  sort_order int not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table battles (
  id uuid primary key default gen_random_uuid(),
  year text not null,
  event text not null,
  result text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- inquiries ----------
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  project_type text,
  budget text,
  message text not null,
  status inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

create index inquiries_status_idx on inquiries (status, created_at desc);

-- ---------- updated_at trigger ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();
create trigger blog_posts_set_updated_at before update on blog_posts
  for each row execute function set_updated_at();
create trigger profile_set_updated_at before update on profile
  for each row execute function set_updated_at();

-- ---------- RLS ----------
alter table profile enable row level security;
alter table projects enable row level security;
alter table services enable row level security;
alter table testimonials enable row level security;
alter table blog_posts enable row level security;
alter table dance_media enable row level security;
alter table battles enable row level security;
alter table inquiries enable row level security;

-- Public: read published content only.
create policy "public read profile" on profile for select using (true);
create policy "public read published projects" on projects for select using (status = 'published');
create policy "public read published services" on services for select using (status = 'published');
create policy "public read published testimonials" on testimonials for select using (status = 'published');
create policy "public read published blog_posts" on blog_posts for select using (status = 'published');
create policy "public read published dance_media" on dance_media for select using (status = 'published');
create policy "public read battles" on battles for select using (true);

-- Public: anyone can submit an inquiry, nobody but admins can read them back.
create policy "public insert inquiries" on inquiries for insert with check (true);

-- Admin (any authenticated user): full access everywhere.
create policy "admin all profile" on profile for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all projects" on projects for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all services" on services for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all testimonials" on testimonials for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all blog_posts" on blog_posts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all dance_media" on dance_media for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all battles" on battles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "admin all inquiries" on inquiries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into profile (name, tagline) values ('MJFIRD', 'Breaker, designer, builder');

-- ---------- storage: public media bucket for uploads ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "public read media" on storage.objects for select using (bucket_id = 'media');
create policy "admin write media" on storage.objects for insert with check (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "admin update media" on storage.objects for update using (bucket_id = 'media' and auth.role() = 'authenticated');
create policy "admin delete media" on storage.objects for delete using (bucket_id = 'media' and auth.role() = 'authenticated');
