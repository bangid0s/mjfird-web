-- Real admin role.
--
-- Until now every RLS policy gated writes on auth.role() = 'authenticated',
-- which was safe only while the sole Supabase Auth users were the site owner.
-- Client accounts (Google / email sign-up for commissions) would have inherited
-- full admin rights. This migration introduces an explicit admin list and
-- rewrites every such policy to call public.is_admin() instead.

create table if not exists admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

-- Seed: every account that exists right now was created by hand in the
-- Supabase dashboard (there was no public sign-up), so they are all admins.
-- Run this migration BEFORE enabling any public sign-up provider.
insert into admins (user_id)
select id from auth.users
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Admins can see the admin list (used by the app to confirm admin access);
-- changes are made in the SQL editor only.
drop policy if exists "admins read self" on admins;
create policy "admins read self" on admins for select using (user_id = auth.uid());

-- Rewrite every existing policy (public + storage schemas) that trusted any
-- signed-in user. Deparsed expressions read `(auth.role() = 'authenticated'::text)`.
do $$
declare
  p record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        coalesce(qual, '') like '%auth.role() = ''authenticated''::text%'
        or coalesce(with_check, '') like '%auth.role() = ''authenticated''::text%'
      )
  loop
    new_qual := replace(p.qual, 'auth.role() = ''authenticated''::text', 'public.is_admin()');
    new_check := replace(p.with_check, 'auth.role() = ''authenticated''::text', 'public.is_admin()');

    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if new_qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;
    execute stmt;
  end loop;
end $$;
