-- Work stages: the steps a commission goes through while it's in progress
-- (Sketch → Lineart → Colour → Final by default, set per service).
--
-- When a request starts work, it takes a copy of its service's stages, so
-- editing a service later never reshuffles an order already underway. The
-- artist can share work-in-progress at any stage; the client then approves it
-- or asks for changes. Every step is logged in commission_stage_events, and
-- both sides get a notification (see 0044_notifications.sql).
--
-- Writes go only through the functions below: the artist's through
-- share_work_stage / advance_work_stage (admin only), the client's through
-- review_work_stage (own request, only while a stage is up for review).
--
-- Additive and safe to run again.

-- ---------- columns ----------
alter table services
  add column if not exists work_stages text[] not null default array['Sketch', 'Lineart', 'Colour', 'Final']::text[];

alter table commission_requests
  add column if not exists work_stages text[] not null default '{}'::text[],
  add column if not exists stage_index int not null default 0,
  add column if not exists stage_status text not null default 'working';

do $$
begin
  alter table commission_requests
    add constraint commission_requests_stage_status_check
    check (stage_status in ('working', 'review', 'approved', 'changes'));
exception
  when duplicate_object then null;
end;
$$;

-- ---------- copy the service's stages when work starts ----------
create or replace function public.snapshot_work_stages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stages text[];
  found_service boolean := false;
begin
  if new.status = 'in_progress'
     and (tg_op = 'INSERT' or old.status is distinct from 'in_progress')
     and coalesce(cardinality(new.work_stages), 0) = 0 then
    select s.work_stages, true into stages, found_service from services s where s.id = new.service_id;
    -- A service with no stages opts out; a deleted service falls back to the default.
    new.work_stages := case
      when found_service then coalesce(stages, '{}'::text[])
      else array['Sketch', 'Lineart', 'Colour', 'Final']::text[]
    end;
    new.stage_index := 0;
    new.stage_status := 'working';
  end if;
  return new;
end;
$$;

drop trigger if exists commission_requests_snapshot_stages on commission_requests;
create trigger commission_requests_snapshot_stages
  before insert or update of status on commission_requests
  for each row execute function public.snapshot_work_stages();

-- Orders already in progress when this runs get their service's stages now.
update commission_requests r
set work_stages = coalesce(
      (select s.work_stages from services s where s.id = r.service_id),
      array['Sketch', 'Lineart', 'Colour', 'Final']::text[]
    ),
    stage_index = 0,
    stage_status = 'working'
where r.status = 'in_progress'
  and cardinality(r.work_stages) = 0;

-- ---------- history ----------
create table if not exists commission_stage_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references commission_requests (id) on delete cascade,
  stage_index int not null,
  stage_name text not null,
  kind text not null check (kind in ('shared', 'approved', 'changes', 'advanced')),
  note text not null default '',
  preview_paths text[] not null default '{}'::text[],
  from_admin boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists commission_stage_events_request_idx
  on commission_stage_events (request_id, created_at);

alter table commission_stage_events enable row level security;

drop policy if exists "read own stage events" on commission_stage_events;
create policy "read own stage events" on commission_stage_events
  for select using (
    public.is_admin()
    or exists (
      select 1 from commission_requests r
      where r.id = commission_stage_events.request_id and r.client_id = auth.uid()
    )
  );
-- No insert/update/delete policies: the functions below are the only writers.

-- ---------- artist: share work-in-progress for review ----------
create or replace function public.share_work_stage(p_request_id uuid, p_note text, p_paths text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r commission_requests;
  prefix text;
  p text;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  select * into r from commission_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if r.status <> 'in_progress' or cardinality(r.work_stages) = 0 then
    raise exception 'stages_not_active';
  end if;
  if length(coalesce(p_note, '')) > 2000 then
    raise exception 'note_too_long';
  end if;
  if coalesce(cardinality(p_paths), 0) = 0 and btrim(coalesce(p_note, '')) = '' then
    raise exception 'nothing_to_share';
  end if;
  if coalesce(cardinality(p_paths), 0) > 12 then
    raise exception 'too_many_files';
  end if;

  -- Previews must live in this request's own progress folder, which only the
  -- client and the admin can read.
  prefix := r.client_id::text || '/progress/' || r.id::text || '/';
  foreach p in array coalesce(p_paths, '{}'::text[]) loop
    if left(p, length(prefix)) <> prefix or position('..' in p) > 0 then
      raise exception 'invalid_file';
    end if;
  end loop;

  update commission_requests set stage_status = 'review' where id = r.id;
  insert into commission_stage_events (request_id, stage_index, stage_name, kind, note, preview_paths, from_admin)
  values (r.id, r.stage_index, r.work_stages[r.stage_index + 1], 'shared', btrim(coalesce(p_note, '')),
          coalesce(p_paths, '{}'::text[]), true);
end;
$$;

-- ---------- artist: move on to the next stage ----------
create or replace function public.advance_work_stage(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r commission_requests;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  select * into r from commission_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if r.status <> 'in_progress' or cardinality(r.work_stages) = 0 then
    raise exception 'stages_not_active';
  end if;
  if r.stage_index >= cardinality(r.work_stages) - 1 then
    raise exception 'last_stage';
  end if;

  update commission_requests
  set stage_index = r.stage_index + 1, stage_status = 'working'
  where id = r.id;
  insert into commission_stage_events (request_id, stage_index, stage_name, kind, from_admin)
  values (r.id, r.stage_index + 1, r.work_stages[r.stage_index + 2], 'advanced', true);
end;
$$;

-- ---------- client: approve, or ask for changes ----------
create or replace function public.review_work_stage(p_request_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r commission_requests;
  note text := btrim(coalesce(p_note, ''));
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  select * into r from commission_requests where id = p_request_id and client_id = auth.uid() for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if r.status <> 'in_progress' or r.stage_status <> 'review' then
    raise exception 'stage_not_in_review';
  end if;
  if length(note) > 2000 then
    raise exception 'note_too_long';
  end if;
  if not coalesce(p_approve, false) and note = '' then
    raise exception 'note_required';
  end if;

  update commission_requests
  set stage_status = case when p_approve then 'approved' else 'changes' end
  where id = r.id;
  insert into commission_stage_events (request_id, stage_index, stage_name, kind, note, from_admin)
  values (r.id, r.stage_index, r.work_stages[r.stage_index + 1],
          case when p_approve then 'approved' else 'changes' end, note, false);
end;
$$;

revoke all on function public.share_work_stage(uuid, text, text[]) from public, anon;
revoke all on function public.advance_work_stage(uuid) from public, anon;
revoke all on function public.review_work_stage(uuid, boolean, text) from public, anon;
grant execute on function public.share_work_stage(uuid, text, text[]) to authenticated;
grant execute on function public.advance_work_stage(uuid) to authenticated;
grant execute on function public.review_work_stage(uuid, boolean, text) to authenticated;

-- ---------- notifications ----------
create or replace function public.notify_commission_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r commission_requests;
begin
  select * into r from commission_requests where id = new.request_id;
  if not found then
    return new;
  end if;

  if new.kind = 'shared' then
    perform public.notify_user(r.client_id, 'stage_review',
      new.stage_name || ' ready for your review on #' || r.ref::text,
      public.notification_snippet(new.note),
      '/account/requests/' || r.id::text || '#stages', r.id);
  elsif new.kind = 'advanced' then
    perform public.notify_user(r.client_id, 'stage_started',
      'Now working on ' || new.stage_name || ' for #' || r.ref::text, '',
      '/account/requests/' || r.id::text || '#stages', r.id);
  elsif new.kind = 'approved' then
    perform public.notify_admins('stage_approved',
      r.contact_name || ' approved ' || new.stage_name || ' on #' || r.ref::text,
      public.notification_snippet(new.note),
      '/admin/requests/' || r.id::text, r.id);
  elsif new.kind = 'changes' then
    perform public.notify_admins('stage_changes',
      r.contact_name || ' asked for changes to ' || new.stage_name || ' on #' || r.ref::text,
      public.notification_snippet(new.note),
      '/admin/requests/' || r.id::text, r.id);
  end if;
  return new;
end;
$$;

drop trigger if exists commission_stage_events_notify on commission_stage_events;
create trigger commission_stage_events_notify
  after insert on commission_stage_events
  for each row execute function public.notify_commission_stage();
