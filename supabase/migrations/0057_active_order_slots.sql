-- Slots count the studio's active queue, not a calendar month: at most N
-- orders in hand at once (site_settings.monthly_slots, kept under its old
-- name). A slot is taken when a request is accepted and comes back when the
-- order is completed, cancelled or declined. Nothing resets on the 1st.
--
-- Replaces the month-based count from 0056. The waitlist trigger and table
-- are unchanged: they read this function.

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
      where r.accepted_at is not null
        and r.status not in ('completed', 'declined', 'cancelled'));
$$;

revoke all on function public.commission_slots() from public;
grant execute on function public.commission_slots() to anon, authenticated;

comment on column public.site_settings.monthly_slots is
  'Most orders in progress at once (accepted, not yet completed). Null = unlimited.';
