-- Extra characters on a commission (DnD parties, MTG cards, custom emotes…).
--
-- A package can let the client add characters on top of the one it includes:
-- packages[].extra_characters_max (0 = not offered, max 20). Each extra
-- character costs the package price again, so +1 doubles the package line,
-- +2 triples it. Add-ons are not multiplied.
--
-- The count is priced here, inside submit_commission_request(), like the rest
-- of the order — the browser only sends a number, never a total.

alter table commission_requests
  add column if not exists extra_characters int not null default 0
    check (extra_characters between 0 and 20);

-- New trailing parameter → new signature. Drop the old one so PostgREST has a
-- single function to resolve (old callers still work: the new arg defaults to 0).
drop function if exists public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[]);

create or replace function public.submit_commission_request(
  p_service_id uuid,
  p_package_id text,
  p_addon_ids text[],
  p_contact_name text,
  p_brief text,
  p_answers jsonb,
  p_reference_paths text[],
  p_extra_characters int default 0
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
  extra int := coalesce(p_extra_characters, 0);
  extra_max int;
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

  -- Extra characters: 0 = the one character the package includes. Each extra
  -- one costs the package price again (+1 doubles it), up to the package's own
  -- limit (0 when the package doesn't offer it).
  extra_max := least(coalesce(nullif(pkg ->> 'extra_characters_max', '')::int, 0), 20);
  if extra < 0 or extra > extra_max then
    raise exception 'invalid_characters';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', a ->> 'id', 'name', a ->> 'name', 'price', round((a ->> 'price')::numeric, 2))),
    '[]'::jsonb
  )
  into chosen
  from jsonb_array_elements(s.addons) a
  where a ->> 'id' = any (coalesce(p_addon_ids, '{}'));

  total := round(
    round((pkg ->> 'price')::numeric, 2) * (1 + extra)
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
    package_id, package_name, package_price, extra_characters, delivery_days, revisions,
    addons, estimated_total, waitlisted,
    contact_name, contact_email, brief, answers, reference_paths
  ) values (
    uid, s.id, s.title, s.slug,
    pkg ->> 'id', pkg ->> 'name', round((pkg ->> 'price')::numeric, 2), extra,
    nullif(pkg ->> 'delivery_days', '')::int, nullif(pkg ->> 'revisions', '')::int,
    chosen, total,
    s.availability = 'waitlist' or (s.slots_total is not null and s.slots_taken >= s.slots_total),
    trim(p_contact_name), coalesce(account_email, ''), trim(p_brief), p_answers, coalesce(p_reference_paths, '{}')
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[], int) from public, anon;
grant execute on function public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[], int) to authenticated;
