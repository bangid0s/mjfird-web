-- Client accounts + commission requests (Phase 2 of the storefront).
--
-- Flow: client requests → artist accepts with a final price (awaiting_payment)
-- or declines → [Phase 3: PayPal] → in_progress → delivered → completed.
--
-- Clients never write the requests table directly. They go through
-- submit_commission_request(), which prices the order from the stored service
-- inside the database, so a total can't be forged from the browser.

-- ---------- client profiles ----------
create table if not exists client_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  email text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table client_profiles enable row level security;

drop policy if exists "client read own profile" on client_profiles;
create policy "client read own profile" on client_profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "client update own profile" on client_profiles;
create policy "client update own profile" on client_profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.client_profiles (id, display_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into client_profiles (id, display_name, email)
select id, split_part(coalesce(email, ''), '@', 1), coalesce(email, '')
from auth.users
on conflict (id) do nothing;

-- ---------- requests ----------
do $$ begin
  create type commission_status as enum (
    'pending', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'declined', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists commission_requests (
  id uuid primary key default gen_random_uuid(),
  ref bigint generated always as identity (start with 1001) unique,
  client_id uuid not null references auth.users (id) on delete cascade,
  service_id uuid references services (id) on delete set null,
  -- Snapshot of what was requested, so later edits to the service don't
  -- rewrite history.
  service_title text not null,
  service_slug text not null,
  package_id text not null,
  package_name text not null,
  package_price numeric(10, 2) not null,
  delivery_days int,
  revisions int,
  addons jsonb not null default '[]'::jsonb, -- [{ id, name, price }]
  estimated_total numeric(10, 2) not null,
  final_price numeric(10, 2) check (final_price is null or final_price >= 0),
  currency text not null default 'USD',
  status commission_status not null default 'pending',
  waitlisted boolean not null default false,
  contact_name text not null,
  contact_email text not null,
  brief text not null,
  answers jsonb not null default '[]'::jsonb, -- [{ id, label, value }]
  reference_paths text[] not null default '{}', -- objects in the `commissions` bucket
  delivery_paths text[] not null default '{}',
  artist_note text not null default '', -- shown to the client (e.g. decline reason)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  paid_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz
);

create index if not exists commission_requests_client_idx on commission_requests (client_id, created_at desc);
create index if not exists commission_requests_status_idx on commission_requests (status, created_at desc);

alter table commission_requests enable row level security;

drop policy if exists "client read own requests" on commission_requests;
create policy "client read own requests" on commission_requests
  for select using (client_id = auth.uid() or public.is_admin());
drop policy if exists "admin all requests" on commission_requests;
create policy "admin all requests" on commission_requests
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists commission_requests_touch on commission_requests;
create trigger commission_requests_touch
  before update on commission_requests
  for each row execute function public.touch_updated_at();

-- ---------- submit (priced server-side) ----------
create or replace function public.submit_commission_request(
  p_service_id uuid,
  p_package_id text,
  p_addon_ids text[],
  p_contact_name text,
  p_brief text,
  p_answers jsonb,
  p_reference_paths text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s services;
  pkg jsonb;
  chosen jsonb;
  total numeric;
  pending_count int;
  account_email text;
  new_id uuid;
  path text;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;

  select * into s from services where id = p_service_id and status = 'published';
  if not found then
    raise exception 'service_not_found';
  end if;
  if s.availability = 'closed' then
    raise exception 'service_closed';
  end if;

  select value into pkg
  from jsonb_array_elements(s.packages)
  where value ->> 'id' = p_package_id
  limit 1;
  if pkg is null then
    raise exception 'package_not_found';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', a ->> 'id', 'name', a ->> 'name', 'price', round((a ->> 'price')::numeric, 2))),
    '[]'::jsonb
  )
  into chosen
  from jsonb_array_elements(s.addons) a
  where a ->> 'id' = any (coalesce(p_addon_ids, '{}'));

  total := round(
    (pkg ->> 'price')::numeric
      + coalesce((select sum((x ->> 'price')::numeric) from jsonb_array_elements(chosen) x), 0),
    2
  );

  if char_length(coalesce(trim(p_contact_name), '')) not between 1 and 200 then
    raise exception 'invalid_name';
  end if;
  if char_length(coalesce(trim(p_brief), '')) not between 10 and 5000 then
    raise exception 'invalid_brief';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' or pg_column_size(p_answers) > 30000 then
    raise exception 'invalid_answers';
  end if;
  if coalesce(array_length(p_reference_paths, 1), 0) > 20 then
    raise exception 'too_many_files';
  end if;
  foreach path in array coalesce(p_reference_paths, '{}') loop
    if path not like uid::text || '/%' or path like '%..%' then
      raise exception 'invalid_file';
    end if;
  end loop;

  select count(*) into pending_count
  from commission_requests
  where client_id = uid and status = 'pending';
  if pending_count >= 5 then
    raise exception 'too_many_pending';
  end if;

  select email into account_email from auth.users where id = uid;

  insert into commission_requests (
    client_id, service_id, service_title, service_slug,
    package_id, package_name, package_price, delivery_days, revisions,
    addons, estimated_total, waitlisted,
    contact_name, contact_email, brief, answers, reference_paths
  ) values (
    uid, s.id, s.title, s.slug,
    pkg ->> 'id', pkg ->> 'name', round((pkg ->> 'price')::numeric, 2),
    nullif(pkg ->> 'delivery_days', '')::int, nullif(pkg ->> 'revisions', '')::int,
    chosen, total,
    s.availability = 'waitlist' or (s.slots_total is not null and s.slots_taken >= s.slots_total),
    trim(p_contact_name), coalesce(account_email, ''), trim(p_brief), p_answers, coalesce(p_reference_paths, '{}')
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[]) from public, anon;
grant execute on function public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[]) to authenticated;

-- ---------- client cancel ----------
create or replace function public.cancel_commission_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r commission_requests;
begin
  select * into r from commission_requests where id = p_request_id and client_id = auth.uid();
  if not found then
    raise exception 'request_not_found';
  end if;
  if r.status not in ('pending', 'awaiting_payment') then
    raise exception 'cannot_cancel';
  end if;

  update commission_requests set status = 'cancelled' where id = r.id;

  -- An accepted request holds a slot; give it back.
  if r.status = 'awaiting_payment' and r.service_id is not null then
    update services set slots_taken = greatest(0, slots_taken - 1) where id = r.service_id;
  end if;
end;
$$;

revoke all on function public.cancel_commission_request(uuid) from public, anon;
grant execute on function public.cancel_commission_request(uuid) to authenticated;

-- ---------- message thread ----------
create table if not exists commission_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references commission_requests (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  from_admin boolean not null default false,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists commission_messages_request_idx on commission_messages (request_id, created_at);

alter table commission_messages enable row level security;

create or replace function public.stamp_commission_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.author_id := auth.uid();
  new.from_admin := public.is_admin();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists commission_messages_stamp on commission_messages;
create trigger commission_messages_stamp
  before insert on commission_messages
  for each row execute function public.stamp_commission_message();

drop policy if exists "read thread" on commission_messages;
create policy "read thread" on commission_messages
  for select using (
    public.is_admin()
    or exists (select 1 from commission_requests r where r.id = request_id and r.client_id = auth.uid())
  );
drop policy if exists "post to thread" on commission_messages;
create policy "post to thread" on commission_messages
  for insert with check (
    public.is_admin()
    or exists (select 1 from commission_requests r where r.id = request_id and r.client_id = auth.uid())
  );
drop policy if exists "admin manage thread" on commission_messages;
create policy "admin manage thread" on commission_messages
  for delete using (public.is_admin());

-- ---------- private file bucket ----------
-- Layout: <client uid>/refs/<file>  and  <client uid>/deliveries/<request id>/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'commissions', 'commissions', false, 20971520,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'application/zip', 'image/vnd.adobe.photoshop', 'application/octet-stream']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "commissions read own or admin" on storage.objects;
create policy "commissions read own or admin" on storage.objects
  for select using (
    bucket_id = 'commissions'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
drop policy if exists "commissions upload own refs or admin" on storage.objects;
create policy "commissions upload own refs or admin" on storage.objects
  for insert with check (
    bucket_id = 'commissions'
    and (
      ((storage.foldername(name))[1] = auth.uid()::text and (storage.foldername(name))[2] = 'refs')
      or public.is_admin()
    )
  );
drop policy if exists "commissions delete own refs or admin" on storage.objects;
create policy "commissions delete own refs or admin" on storage.objects
  for delete using (
    bucket_id = 'commissions'
    and (
      ((storage.foldername(name))[1] = auth.uid()::text and (storage.foldername(name))[2] = 'refs')
      or public.is_admin()
    )
  );
