-- Custom quotes go through commission requests, not inquiries.
--
-- A service with no fixed packages (e.g. custom illustration) used to send
-- clients to the contact form, so their order landed in Inquiries with no
-- tracking, payment or messages. submit_quote_request() files it as a normal
-- commission request instead, marked by package_id = 'custom-quote':
--
--   * package_name 'Custom quote', price and estimated total 0
--   * status 'pending' like any request; the artist sets final_price when
--     accepting (the app requires a price above 0 for quotes)
--   * same checks as submit_commission_request(): signed in, published and
--     open service, name, brief, answers, own reference files, max 5 pending
--
-- Only allowed for services that have no packages; a service with packages
-- keeps the priced flow. The contact form stays for plain inquiries.
--
-- Additive and safe to run again.

create or replace function public.submit_quote_request(
  p_service_id uuid,
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
  if jsonb_typeof(s.packages) = 'array' and jsonb_array_length(s.packages) > 0 then
    raise exception 'quote_not_offered';
  end if;

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
    package_id, package_name, package_price, estimated_total, waitlisted,
    contact_name, contact_email, brief, answers, reference_paths
  ) values (
    uid, s.id, s.title, s.slug,
    'custom-quote', 'Custom quote', 0, 0,
    s.availability = 'waitlist' or (s.slots_total is not null and s.slots_taken >= s.slots_total),
    trim(p_contact_name), coalesce(account_email, ''), trim(p_brief), p_answers, coalesce(p_reference_paths, '{}')
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_quote_request(uuid, text, text, jsonb, text[]) from public;
revoke all on function public.submit_quote_request(uuid, text, text, jsonb, text[]) from anon;
grant execute on function public.submit_quote_request(uuid, text, text, jsonb, text[]) to authenticated;
