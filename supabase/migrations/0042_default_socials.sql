-- Social profiles: Instagram, X, YouTube and Discord.
-- Appends each one to profile.socials only when no entry for that platform
-- exists yet, so links already edited in /admin/profile are left alone.
-- Placeholder entries that point at a bare platform home page are dropped.

update public.profile p
set socials = (
  with kept as (
    select e
    from jsonb_array_elements(coalesce(p.socials, '[]'::jsonb)) e
    where (e->>'url') !~* '^https?://(www\.)?(instagram|youtube|github|x|twitter)\.com/?$'
  ),
  wanted(label, url, pattern, ord) as (
    values
      ('Instagram', 'https://www.instagram.com/m.j.fird', 'instagram', 1),
      ('X',         'https://x.com/MJFird',               '(^|\W)(x\.com|twitter)', 2),
      ('YouTube',   'https://www.youtube.com/@MJFiRD',    'youtube|youtu\.be', 3),
      ('Discord',   'https://discord.gg/6exYhqVmvx',      'discord', 4)
  )
  select coalesce(jsonb_agg(item order by grp, ord), '[]'::jsonb)
  from (
    select e as item, 0 as grp, 0 as ord from kept
    union all
    select jsonb_build_object('label', w.label, 'url', w.url), 1, w.ord
    from wanted w
    where not exists (select 1 from kept k where (k.e->>'url') ~* w.pattern)
  ) merged
);

-- A fresh install with no profile row yet gets one with the four links.
insert into public.profile (name, socials)
select 'MJFIRD', jsonb_build_array(
  jsonb_build_object('label', 'Instagram', 'url', 'https://www.instagram.com/m.j.fird'),
  jsonb_build_object('label', 'X',         'url', 'https://x.com/MJFird'),
  jsonb_build_object('label', 'YouTube',   'url', 'https://www.youtube.com/@MJFiRD'),
  jsonb_build_object('label', 'Discord',   'url', 'https://discord.gg/6exYhqVmvx')
)
where not exists (select 1 from public.profile);
