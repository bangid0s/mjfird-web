-- PayPal invoice / payment links on commission requests.
--
-- Nullable payment_url is an https link on paypal.com or paypal.me.
-- Clients keep SELECT on their own rows (0029). They still have no UPDATE.
-- set_commission_payment_url is admin-only. The trigger applies the same
-- rules to a direct insert or update, so a table write cannot skip them.
-- Safe to run again. Adds columns and functions only.

alter table public.commission_requests
  add column if not exists payment_url text;

alter table public.commission_requests
  add column if not exists payment_url_set_at timestamptz;

-- Canonical https URL, or null when the link is cleared.
-- Raises payment_url_invalid or payment_url_too_long.
-- Mirrored by src/lib/commissions/payment-link.ts.
create or replace function public.commission_payment_url_normalize(p_url text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  raw text;
  rest text;
  authority text;
  tail text;
  host text;
  port text;
  cut int;
  slash int;
  qmark int;
  hash int;
  colon int;
begin
  if p_url is null then
    return null;
  end if;

  raw := btrim(p_url);
  if raw = '' then
    return null;
  end if;

  if char_length(raw) > 2000 then
    raise exception 'payment_url_too_long';
  end if;

  -- Printable ASCII, no space. Rejects control characters and Unicode lookalikes.
  if raw ~ '[^!-~]' or position(chr(92) in raw) > 0 then
    raise exception 'payment_url_invalid';
  end if;

  if left(raw, 2) = '//' or lower(left(raw, 8)) <> 'https://' then
    raise exception 'payment_url_invalid';
  end if;

  rest := substring(raw from 9);
  if rest = '' then
    raise exception 'payment_url_invalid';
  end if;

  slash := position('/' in rest);
  qmark := position('?' in rest);
  hash := position('#' in rest);
  cut := char_length(rest) + 1;
  if slash > 0 and slash < cut then cut := slash; end if;
  if qmark > 0 and qmark < cut then cut := qmark; end if;
  if hash > 0 and hash < cut then cut := hash; end if;

  authority := substring(rest from 1 for cut - 1);
  tail := substring(rest from cut);

  if authority = '' or position('@' in authority) > 0 or left(authority, 1) = '[' then
    raise exception 'payment_url_invalid';
  end if;

  if position(':' in authority) = 0 then
    host := authority;
    port := '';
  else
    colon := char_length(authority) - position(':' in reverse(authority)) + 1;
    host := substring(authority from 1 for colon - 1);
    port := substring(authority from colon + 1);
    if port <> '443' or host = '' or position(':' in host) > 0 then
      raise exception 'payment_url_invalid';
    end if;
  end if;

  host := lower(host);

  -- IPv4 and decimal IP literals. Bracketed IPv6 is already rejected.
  if host ~ '^[0-9]+(\.[0-9]+){0,3}$' then
    raise exception 'payment_url_invalid';
  end if;

  if host not in ('paypal.com', 'www.paypal.com', 'paypal.me', 'www.paypal.me') then
    raise exception 'payment_url_invalid';
  end if;

  return 'https://' || host || tail;
end;
$$;

create or replace function public.enforce_commission_payment_url()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := public.commission_payment_url_normalize(new.payment_url);

  if tg_op = 'UPDATE' and normalized is not distinct from old.payment_url then
    new.payment_url := old.payment_url;
    new.payment_url_set_at := old.payment_url_set_at;
    return new;
  end if;

  if tg_op = 'INSERT' and normalized is null then
    new.payment_url := null;
    new.payment_url_set_at := null;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status not in ('pending', 'awaiting_payment') then
    raise exception 'payment_url_status';
  end if;
  if new.status not in ('pending', 'awaiting_payment') then
    raise exception 'payment_url_status';
  end if;

  if normalized is null then
    new.payment_url := null;
    new.payment_url_set_at := null;
  else
    new.payment_url := normalized;
    new.payment_url_set_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.set_commission_payment_url(p_request_id uuid, p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.commission_requests;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  select * into req from public.commission_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if req.status not in ('pending', 'awaiting_payment') then
    raise exception 'payment_url_status';
  end if;

  perform public.commission_payment_url_normalize(p_url);

  update public.commission_requests
  set payment_url = p_url
  where id = req.id;
end;
$$;

drop trigger if exists commission_requests_payment_url on public.commission_requests;
create trigger commission_requests_payment_url
  before insert or update on public.commission_requests
  for each row execute function public.enforce_commission_payment_url();

revoke all on function public.commission_payment_url_normalize(text) from public;
revoke all on function public.enforce_commission_payment_url() from public;
revoke all on function public.set_commission_payment_url(uuid, text) from public;

-- The owner still runs the trigger and the RPC (both security definer).
grant execute on function public.commission_payment_url_normalize(text) to current_user;
grant execute on function public.enforce_commission_payment_url() to current_user;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.commission_payment_url_normalize(text) from anon;
    revoke all on function public.enforce_commission_payment_url() from anon;
    revoke all on function public.set_commission_payment_url(uuid, text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.commission_payment_url_normalize(text) from authenticated;
    revoke all on function public.enforce_commission_payment_url() from authenticated;
    revoke all on function public.set_commission_payment_url(uuid, text) from authenticated;
    grant execute on function public.set_commission_payment_url(uuid, text) to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on function public.commission_payment_url_normalize(text) from service_role;
    revoke all on function public.enforce_commission_payment_url() from service_role;
    revoke all on function public.set_commission_payment_url(uuid, text) from service_role;
  end if;
end $$;
