-- "May I publicly stream / share the work with credit?" on every request.
--
--   public      Yes
--   final_only  Not while it's a work in progress, but the final piece is OK
--   nda         No, NDA required: adds the service's privacy fee
--
-- The NDA fee is flat (services.nda_fee, default $100), charged once. It is
-- not multiplied by extra characters and not part of the usage-license base,
-- so a commercial license (+100%) doesn't double it. The database prices it;
-- the browser only sends the choice.
--
-- It replaces the "Private / NDA" add-on. Those add-ons are moved here (their
-- price becomes the service's nda_fee) and removed from addons, so a client
-- can never pay for NDA twice (add-on + answer). Requests already placed keep
-- the add-on they paid for.
--
-- Custom quotes record the answer too, without a fee: the artist includes it
-- in the quoted price.
--
-- Additive and safe to run again.

alter table services
  add column if not exists nda_fee numeric(10, 2) not null default 100 check (nda_fee >= 0);

alter table commission_requests
  add column if not exists sharing text check (sharing in ('public', 'final_only', 'nda')),
  add column if not exists privacy_fee numeric(10, 2) not null default 0 check (privacy_fee >= 0);

-- Move NDA / private add-ons into nda_fee. Matches names like "Private / NDA",
-- "NDA", "Private commission"; on a re-run there are none left to move.
update services s
set nda_fee = moved.fee,
    addons = moved.rest
from (
  select id,
    max(round((a ->> 'price')::numeric, 2)) filter (where a ->> 'name' ~* '(\mnda\M|private|privacy)') as fee,
    coalesce(jsonb_agg(a) filter (where not (a ->> 'name' ~* '(\mnda\M|private|privacy)')), '[]'::jsonb) as rest
  from services, jsonb_array_elements(case when jsonb_typeof(addons) = 'array' then addons else '[]'::jsonb end) a
  group by id
) moved
where s.id = moved.id and moved.fee is not null;

-- New trailing parameter → new signature; drop the previous ones (callers
-- that don't send p_sharing still resolve here through the default).
drop function if exists public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[], int, text, text);
drop function if exists public.submit_quote_request(uuid, text, text, jsonb, text[]);

create or replace function public.submit_commission_request(
  p_service_id uuid,
  p_package_id text,
  p_addon_ids text[],
  p_contact_name text,
  p_brief text,
  p_answers jsonb,
  p_reference_paths text[],
  p_extra_characters int default 0,
  p_license text default 'personal',
  p_background text default null,
  p_sharing text default null
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
  lic_id text := coalesce(nullif(trim(p_license), ''), 'personal');
  lic jsonb;
  lic_percent numeric;
  bgs jsonb;
  bg jsonb;
  bg_price numeric := 0;
  base numeric;
  fee numeric;
  total numeric;
  share text := nullif(trim(coalesce(p_sharing, '')), '');
  privacy numeric := 0;
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

  -- Background: pick exactly one when the service offers any. No choice sent
  -- (older callers) → the first option; an id the service doesn't offer is refused.
  bgs := case when jsonb_typeof(s.backgrounds) = 'array' then s.backgrounds else '[]'::jsonb end;
  if jsonb_array_length(bgs) > 0 then
    if coalesce(trim(p_background), '') = '' then
      bg := bgs -> 0;
    else
      select value into bg from jsonb_array_elements(bgs) where value ->> 'id' = trim(p_background) limit 1;
      if bg is null then
        raise exception 'invalid_background';
      end if;
    end if;
    bg_price := greatest(round(coalesce(nullif(bg ->> 'price', '')::numeric, 0), 2), 0);
  end if;

  base := round(
    round((pkg ->> 'price')::numeric, 2) * (1 + extra)
      + coalesce((select sum((x ->> 'price')::numeric) from jsonb_array_elements(chosen) x), 0)
      + bg_price,
    2
  );

  -- Usage license: the service's stored entry laid over the default for that
  -- id. Personal use is always allowed; the others only while enabled.
  select d.value || coalesce(
    (select o.value from jsonb_array_elements(case when jsonb_typeof(s.licenses) = 'array' then s.licenses else '[]'::jsonb end) o
     where o.value ->> 'id' = lic_id limit 1),
    '{}'::jsonb
  )
  into lic
  from jsonb_array_elements(public.default_service_licenses()) d
  where d.value ->> 'id' = lic_id;
  if lic is null or (lic_id <> 'personal' and coalesce((lic ->> 'enabled')::boolean, true) = false) then
    raise exception 'invalid_license';
  end if;
  lic_percent := least(greatest(coalesce(nullif(lic ->> 'percent', '')::numeric, 0), 0), 500);
  fee := round(base * lic_percent / 100, 2);

  -- Sharing: may the artist stream / post the work? Only NDA costs anything:
  -- the service's flat privacy fee, charged once and kept out of the license
  -- base so a commercial license doesn't double it. No answer (older callers)
  -- → recorded as null, no fee.
  if share is not null and share not in ('public', 'final_only', 'nda') then
    raise exception 'invalid_sharing';
  end if;
  if share = 'nda' then
    privacy := greatest(round(coalesce(s.nda_fee, 0), 2), 0);
  end if;
  total := base + fee + privacy;

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
    addons, background_id, background_name, background_price, license_id, license_name, license_percent, license_fee, sharing, privacy_fee, estimated_total, waitlisted,
    contact_name, contact_email, brief, answers, reference_paths
  ) values (
    uid, s.id, s.title, s.slug,
    pkg ->> 'id', pkg ->> 'name', round((pkg ->> 'price')::numeric, 2), extra,
    nullif(pkg ->> 'delivery_days', '')::int, nullif(pkg ->> 'revisions', '')::int,
    chosen, bg ->> 'id', bg ->> 'name', bg_price, lic_id, coalesce(nullif(lic ->> 'name', ''), lic_id), lic_percent, fee, share, privacy, total,
    s.availability = 'waitlist' or (s.slots_total is not null and s.slots_taken >= s.slots_total),
    trim(p_contact_name), coalesce(account_email, ''), trim(p_brief), p_answers, coalesce(p_reference_paths, '{}')
  )
  returning id into new_id;

  return new_id;
end;
$$;


create or replace function public.submit_quote_request(
  p_service_id uuid,
  p_contact_name text,
  p_brief text,
  p_answers jsonb,
  p_reference_paths text[],
  p_sharing text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s services;
  pending_count int;
  account_email text;
  new_id uuid;
  path text;
  share text := nullif(trim(coalesce(p_sharing, '')), '');
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
  if jsonb_typeof(s.packages) = 'array' and jsonb_array_length(s.packages) > 0 then
    raise exception 'quote_not_offered';
  end if;

  if char_length(coalesce(trim(p_contact_name), '')) not between 1 and 200 then
    raise exception 'invalid_name';
  end if;
  if char_length(coalesce(trim(p_brief), '')) not between 10 and 5000 then
    raise exception 'invalid_brief';
  end if;
  -- The NDA fee isn't added here: a quote has no price yet, so the artist
  -- includes it in the quoted price.
  if share is not null and share not in ('public', 'final_only', 'nda') then
    raise exception 'invalid_sharing';
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
    package_id, package_name, package_price, estimated_total, sharing, waitlisted,
    contact_name, contact_email, brief, answers, reference_paths
  ) values (
    uid, s.id, s.title, s.slug,
    'custom-quote', 'Custom quote', 0, 0, share,
    s.availability = 'waitlist' or (s.slots_total is not null and s.slots_taken >= s.slots_total),
    trim(p_contact_name), coalesce(account_email, ''), trim(p_brief), p_answers, coalesce(p_reference_paths, '{}')
  )
  returning id into new_id;

  return new_id;
end;
$$;


revoke all on function public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[], int, text, text, text) from public, anon;
grant execute on function public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[], int, text, text, text) to authenticated;
revoke all on function public.submit_quote_request(uuid, text, text, jsonb, text[], text) from public, anon;
grant execute on function public.submit_quote_request(uuid, text, text, jsonb, text[], text) to authenticated;
