-- Editable headings for the homepage sections (work, services, testimonials).

alter table site_settings
  add column if not exists work_section_eyebrow text not null default 'Selected Work',
  add column if not exists work_section_title text not null default 'Recent moves',
  add column if not exists services_section_eyebrow text not null default 'Services',
  add column if not exists services_section_title text not null default 'What I build',
  add column if not exists testimonials_section_eyebrow text not null default 'Word on the Floor',
  add column if not exists testimonials_section_title text not null default 'What clients say';
