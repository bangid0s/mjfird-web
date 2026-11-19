-- Admin → Clients (/admin/clients).
--
-- The page lists every client_profiles row (admins could already read them all,
-- see 0029) and leaves admin accounts out. Until now an admin could only read
-- their own `admins` row, so a second admin (e.g. an assistant) would show up
-- as a "client". Let admins read the whole list; changes still go through the
-- SQL editor only. is_admin() is security definer, so this doesn't recurse.

drop policy if exists "admins read self" on admins;
drop policy if exists "admins read self or all if admin" on admins;
create policy "admins read self or all if admin" on admins
  for select using (user_id = auth.uid() or public.is_admin());

-- The list joins orders by client and sorts by date.
create index if not exists commission_requests_client_created_idx
  on commission_requests (client_id, created_at desc);
