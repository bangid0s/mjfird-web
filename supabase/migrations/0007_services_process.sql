-- Editable "Process" section on /services.

alter table site_settings
  add column if not exists process_section_eyebrow text not null default 'Process',
  add column if not exists process_section_title text not null default 'How a project runs',
  add column if not exists process_steps jsonb not null default '[
    {"title": "Discovery", "description": "A working session to pin down goals, audience, and the one thing the site has to do."},
    {"title": "Direction", "description": "Two design directions, explored fast, so we agree on a point of view before pixels get precious."},
    {"title": "Build", "description": "Design system first, then pages — motion and performance engineered in from the start, not bolted on."},
    {"title": "Launch", "description": "QA across devices, a short handover walkthrough, and you own everything — no lock-in."}
  ]'::jsonb;
