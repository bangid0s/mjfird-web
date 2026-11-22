-- Monthly commission capacity for the whole studio ("3 of 6 slots in
-- December"), counted by itself: a slot is taken when the artist accepts a
-- request in that month (Western Indonesia Time) and freed again if the order
-- is later cancelled. Empty capacity means unlimited and hides the badge.
--
-- When the month is full, new requests still come in but are marked as
-- waitlisted, and visitors can leave an email to hear when slots reopen.

alter table public.site_settings
  add column if not exists monthly_slots integer
  check (monthly_slots is null or monthly_slots between 0 and 200);

-- Start at the owner's chosen capacity. Only fills an empty value, so a
-- later change in the admin is never overwritten by a re-run.
update public.site_settings set monthly_slots = 6 where monthly_slots is null;

-- Public numbers only: capacity and how many are taken. No order details.
create or replace function public.commission_slots()
returns table (total integer, taken integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select s.monthly_slots from public.site_settings s limit 1),
    (select count(*)::integer
       from public.commission_requests r
      where r.accepted_at >= (date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')
        and r.status not in ('declined', 'cancelled'));
$$;

revoke all on function public.commission_slots() from public;
grant execute on function public.commission_slots() to anon, authenticated;

-- A request sent while the month is full joins the waitlist. A trigger, so
-- both request functions (package and quote) follow it without being rewritten.
create or replace function public.waitlist_when_month_full()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  used integer;
begin
  select total, taken into cap, used from public.commission_slots();
  if cap is not null and used >= cap then
    new.waitlisted := true;
  end if;
  return new;
end;
$$;

drop trigger if exists commission_requests_month_full on public.commission_requests;
create trigger commission_requests_month_full
  before insert on public.commission_requests
  for each row execute function public.waitlist_when_month_full();

-- "Notify me when slots open": anyone may add an email, only the admin reads.
create table if not exists public.slot_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  service_slug text check (service_slug is null or length(service_slug) <= 120),
  created_at timestamptz not null default now(),
  notified_at timestamptz
);

create unique index if not exists slot_waitlist_email_key on public.slot_waitlist (lower(email));

alter table public.slot_waitlist enable row level security;

drop policy if exists "anyone joins the slot waitlist" on public.slot_waitlist;
create policy "anyone joins the slot waitlist" on public.slot_waitlist
  for insert to anon, authenticated
  with check (notified_at is null);

drop policy if exists "admin manages the slot waitlist" on public.slot_waitlist;
create policy "admin manages the slot waitlist" on public.slot_waitlist
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
