-- Site-wide editable copy and theme, so the whole site can be run from /admin
-- without touching code. Singleton table, same pattern as `profile`.

create table site_settings (
  id uuid primary key default gen_random_uuid(),

  -- Brand / theme
  accent_color text not null default '#ff2e88',
  site_title text not null default 'MJFIRD — breaker, designer, builder',
  site_description text not null default 'MJFIRD is a designer and developer with a decade in the cypher. Portfolio, services, and case studies.',

  -- Homepage hero
  hero_eyebrow text not null default 'Breaker — Designer — Builder',
  hero_intro text not null default 'A decade in the cypher taught me rhythm and restraint. I bring both to brand, motion, and web work for people who don''t want to look like a template.',
  hero_cta_primary text not null default 'See the work',
  hero_cta_secondary text not null default 'Start a project',
  marquee_items text[] not null default array['Brand Identity', 'Motion Design', 'Web Build', 'Art Direction', 'Cypher-tested'],
  stats jsonb not null default '[
    {"value": 10, "suffix": "+", "label": "Years in the cypher"},
    {"value": 38, "suffix": "", "label": "Projects shipped"},
    {"value": 14, "suffix": "", "label": "Cities battled in"},
    {"value": 96, "suffix": "%", "label": "Lighthouse perf avg"}
  ]'::jsonb,

  -- About page
  about_headline text not null default 'Ten years reading rhythm — on the floor and on the grid.',
  about_timeline jsonb not null default '[
    {"year": "2015", "label": "Started breaking", "detail": "First cypher, first freeze, first time getting clowned for a bad landing."},
    {"year": "2018", "label": "First battle win", "detail": "Regional 2v2 title — the first time it felt like more than a hobby."},
    {"year": "2020", "label": "Picked up design", "detail": "Started making flyers for the crew because no one else would."},
    {"year": "2022", "label": "First client work", "detail": "Brand identity for a local label, learned the business side fast."},
    {"year": "2024", "label": "Went full-time", "detail": "Design and dev work for crews, labels, and small brands, full-time."}
  ]'::jsonb,
  about_skills text[] not null default array['Art direction', 'Brand systems', 'Motion design', 'Next.js / React', 'GSAP / WebGL', 'Design systems', 'CMS architecture', 'Performance engineering'],

  -- Footer CTA band
  footer_heading text not null default E'Let''s build\nsomething',
  footer_subtext text not null default 'Got a project / a battle to plan',
  contact_email text not null default 'hello@mjfird.com',

  -- Services page
  services_availability_heading text not null default E'Booking projects\nfor Q4 2026',
  services_availability_label text not null default 'Availability',

  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at before update on site_settings
  for each row execute function set_updated_at();

alter table site_settings enable row level security;

create policy "public read site_settings" on site_settings for select using (true);
create policy "admin all site_settings" on site_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into site_settings default values;
