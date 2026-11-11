-- Usage licenses on commissions (like VGen's request form).
--
-- Every service offers three tiers: personal use (default, always on),
-- monetized content and commercial merchandising. services.licenses stores the
-- admin's overrides [{ id, name, description, percent, enabled }]; anything
-- missing falls back to default_service_licenses(). The surcharge is a
-- percentage of the order total before the license (package × characters +
-- add-ons): monetized +50%, commercial +100% by default.
--
-- As with everything else, the database prices the license — the browser
-- only sends which one was picked.

alter table services
  add column if not exists licenses jsonb not null default '[]'::jsonb;

alter table commission_requests
  add column if not exists license_id text not null default 'personal'
    check (license_id in ('personal', 'monetized', 'commercial')),
  add column if not exists license_name text not null default 'Personal use',
  add column if not exists license_percent numeric(6, 2) not null default 0
    check (license_percent between 0 and 500),
  add column if not exists license_fee numeric(10, 2) not null default 0
    check (license_fee >= 0);

-- Mirrors DEFAULT_LICENSES in src/lib/services/storefront.ts.
create or replace function public.default_service_licenses()
returns jsonb
language sql
immutable
as $$
  select '[
    {"id": "personal", "name": "Personal use", "percent": 0, "enabled": true},
    {"id": "monetized", "name": "Monetized content", "percent": 50, "enabled": true},
    {"id": "commercial", "name": "Commercial merchandising", "percent": 100, "enabled": true}
  ]'::jsonb
$$;

-- New trailing parameter → new signature; drop the previous one so there is a
-- single function to resolve (older callers still work: it defaults to personal).
drop function if exists public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[], int);

create or replace function public.submit_commission_request(
  p_service_id uuid,
  p_package_id text,
  p_addon_ids text[],
  p_contact_name text,
  p_brief text,
  p_answers jsonb,
  p_reference_paths text[],
  p_extra_characters int default 0,
  p_license text default 'personal'
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
  base numeric;
  fee numeric;
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

  base := round(
    round((pkg ->> 'price')::numeric, 2) * (1 + extra)
      + coalesce((select sum((x ->> 'price')::numeric) from jsonb_array_elements(chosen) x), 0),
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
  total := base + fee;

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
    addons, license_id, license_name, license_percent, license_fee, estimated_total, waitlisted,
    contact_name, contact_email, brief, answers, reference_paths
  ) values (
    uid, s.id, s.title, s.slug,
    pkg ->> 'id', pkg ->> 'name', round((pkg ->> 'price')::numeric, 2), extra,
    nullif(pkg ->> 'delivery_days', '')::int, nullif(pkg ->> 'revisions', '')::int,
    chosen, lic_id, coalesce(nullif(lic ->> 'name', ''), lic_id), lic_percent, fee, total,
    s.availability = 'waitlist' or (s.slots_total is not null and s.slots_taken >= s.slots_total),
    trim(p_contact_name), coalesce(account_email, ''), trim(p_brief), p_answers, coalesce(p_reference_paths, '{}')
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[], int, text) from public, anon;
grant execute on function public.submit_commission_request(uuid, text, text[], text, text, jsonb, text[], int, text) to authenticated;
