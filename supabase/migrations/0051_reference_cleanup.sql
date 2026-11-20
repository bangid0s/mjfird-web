-- Reference cleanup: free storage by removing the reference files clients
-- attached, once the order is over.
--
--   * completed / declined / cancelled orders: 15 days after closing
--   * uploads never attached to any order (abandoned or re-tried forms):
--     48 hours after upload
--
-- A file shared by several requests is only removed once every one of them is
-- closed past the grace period. Deliveries are never touched. The planning and
-- the actual deletes live in src/lib/commissions/reference-cleanup*.ts; this
-- migration adds the timestamps it needs and a way to list stored references.

alter table commission_requests
  add column if not exists closed_at timestamptz,
  add column if not exists references_purged_at timestamptz,
  add column if not exists references_purged_count integer not null default 0;

-- Completed orders already had completed_at. Declined and cancelled ones only
-- have updated_at, which is the best guess at when they closed.
update commission_requests
set closed_at = coalesce(completed_at, updated_at)
where status in ('completed', 'declined', 'cancelled') and closed_at is null;

create or replace function public.stamp_commission_closed()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('completed', 'declined', 'cancelled') then
    if old.status is null or old.status not in ('completed', 'declined', 'cancelled') then
      new.closed_at := now();
    end if;
  else
    -- Reopened: the grace period starts again when it closes next time.
    new.closed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists commission_requests_closed_at on commission_requests;
create trigger commission_requests_closed_at
  before update of status on commission_requests
  for each row execute function public.stamp_commission_closed();

create index if not exists commission_requests_closed_idx
  on commission_requests (closed_at)
  where closed_at is not null;

-- Every reference file in the bucket with its size and upload time. Storage's
-- list API walks one folder at a time and has no size totals; this is one
-- query. Admins and the server's service role only.
create or replace function public.commission_reference_objects()
returns table (name text, size bigint, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'not_allowed';
  end if;
  return query
    select o.name, coalesce((o.metadata ->> 'size')::bigint, 0), o.created_at
    from storage.objects o
    where o.bucket_id = 'commissions'
      and (storage.foldername(o.name))[2] = 'refs';
end;
$$;

revoke all on function public.commission_reference_objects() from public, anon;
grant execute on function public.commission_reference_objects() to authenticated, service_role;
