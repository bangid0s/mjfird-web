-- Public pages overhaul: an offer headline and proof note for the hero, a
-- general FAQ for /services, and the monthly retainer band. Every column has a
-- default so the site reads the same before and after this runs.

alter table site_settings
  add column if not exists hero_headline text not null default '',
  add column if not exists hero_proof_note text not null default '',
  add column if not exists services_faq jsonb not null default '[]'::jsonb,
  add column if not exists retainer_enabled boolean not null default true,
  add column if not exists retainer_eyebrow text not null default 'Ongoing work',
  add column if not exists retainer_title text not null default 'Monthly retainer',
  add column if not exists retainer_intro text not null default 'A reserved block of illustration and design time every month, for studios and brands with a steady pipeline.',
  add column if not exists retainer_points text[] not null default array['Priority scheduling', 'One point of contact', 'Consistent style across every piece', 'Monthly invoice'],
  add column if not exists retainer_price_label text not null default 'Quote on request',
  add column if not exists retainer_cta_label text not null default 'Ask about a retainer';
