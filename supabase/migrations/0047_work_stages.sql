-- Work stages: the steps a commission goes through while it's in progress
-- (Sketch → Lineart → Colour → Final by default, set per service). They are
-- a progress marker only: previews and feedback happen in the client's
-- Discord ticket. The artist moves the marker; the client sees where their
-- order is and gets a notification when it moves forward.
--
-- When a request starts work, it takes a copy of its service's stages, so
-- editing a service later never reshuffles an order already underway.
--
-- Additive and safe to run again.

-- ---------- columns ----------
alter table services
  add column if not exists work_stages text[] not null default array['Sketch', 'Lineart', 'Colour', 'Final']::text[];

alter table commission_requests
  add column if not exists work_stages text[] not null default '{}'::text[],
  add column if not exists stage_index int not null default 0;

do $$
begin
  alter table commission_requests
    add constraint commission_requests_stage_index_check
    check (stage_index >= 0 and (cardinality(work_stages) = 0 or stage_index < cardinality(work_stages)));
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
    stage_index = 0
where r.status = 'in_progress'
  and cardinality(r.work_stages) = 0;

-- ---------- tell the client when their order moves forward ----------
create or replace function public.notify_work_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'in_progress'
     and new.stage_index > old.stage_index
     and cardinality(new.work_stages) > new.stage_index then
    perform public.notify_user(new.client_id, 'stage_started',
      'Now working on ' || new.work_stages[new.stage_index + 1] || ' for #' || new.ref::text,
      'Step ' || (new.stage_index + 1)::text || ' of ' || cardinality(new.work_stages)::text,
      '/account/requests/' || new.id::text, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists commission_requests_notify_stage on commission_requests;
create trigger commission_requests_notify_stage
  after update of stage_index on commission_requests
  for each row execute function public.notify_work_stage();
