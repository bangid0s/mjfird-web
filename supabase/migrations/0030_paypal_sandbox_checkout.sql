-- PayPal sandbox order/capture binding for an existing commission request.
-- Apply this file only to an isolated database. The app does not run it.
-- One checkout row per request. order_id stays empty until PayPal returns an id.
-- capture_pending is set before PayPal is asked to capture, and blocks manual
-- mark-paid and cancel until the capture is stored or PayPal says it did not charge.
-- A completed capture is always stored, including when the request was already
-- marked in progress, so a provider charge is not dropped.

create table if not exists public.commission_paypal_checkouts (
  request_id uuid primary key references public.commission_requests (id) on delete restrict,
  order_id text unique,
  capture_id text unique,
  capture_pending boolean not null default false,
  -- open: no provider result yet. held: a charge or ambiguous result is stored and must not be paid or cleared. matched: amount and currency agreed.
  capture_disposition text not null default 'open' check (capture_disposition in ('open', 'uncertain', 'held', 'matched')),
  provider_evidence text,
  expected_merchant text,
  merchant_proven boolean not null default false,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null check (currency = 'USD'),
  created_at timestamptz not null default now(),
  captured_at timestamptz
);

alter table public.commission_paypal_checkouts enable row level security;

create or replace function public.reserve_commission_paypal_order(
  p_request_id uuid,
  p_amount text,
  p_currency text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  req commission_requests;
  existing commission_paypal_checkouts;
  amount numeric;
begin
  if p_currency is distinct from 'USD' then
    raise exception 'amount_mismatch';
  end if;
  begin
    amount := trim(p_amount)::numeric;
  exception when others then
    raise exception 'amount_mismatch';
  end;
  if amount is null or amount <= 0 then
    raise exception 'missing_price';
  end if;

  select * into req from commission_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if req.status <> 'awaiting_payment' then
    raise exception 'not_payable';
  end if;
  if req.currency is distinct from 'USD' or req.final_price is null or req.final_price <= 0 or req.final_price <> amount then
    raise exception 'amount_mismatch';
  end if;

  select * into existing from commission_paypal_checkouts where request_id = p_request_id for update;
  if found then
    if existing.capture_id is not null or existing.amount <> amount or existing.currency <> 'USD' then
      raise exception 'not_payable';
    end if;
    if existing.order_id is not null then
      return 'reuse:' || existing.order_id;
    end if;
    return 'create';
  end if;

  insert into commission_paypal_checkouts (request_id, amount, currency)
  values (p_request_id, amount, 'USD');
  return 'create';
end;
$$;

create or replace function public.attach_commission_paypal_order(
  p_request_id uuid,
  p_order_id text,
  p_amount text,
  p_currency text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing commission_paypal_checkouts;
  amount numeric;
begin
  if p_order_id is null or length(trim(p_order_id)) = 0 then
    raise exception 'invalid_order';
  end if;
  if p_currency is distinct from 'USD' then
    raise exception 'amount_mismatch';
  end if;
  begin
    amount := trim(p_amount)::numeric;
  exception when others then
    raise exception 'amount_mismatch';
  end;

  perform 1 from commission_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  select * into existing from commission_paypal_checkouts where request_id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if existing.amount <> amount or existing.currency <> 'USD' then
    raise exception 'amount_mismatch';
  end if;
  if existing.order_id is not null then
    return existing.order_id;
  end if;

  update commission_paypal_checkouts
  set order_id = trim(p_order_id)
  where request_id = p_request_id and order_id is null;
  if not found then
    select order_id into existing.order_id from commission_paypal_checkouts where request_id = p_request_id;
    if existing.order_id is not null then
      return existing.order_id;
    end if;
    raise exception 'not_payable';
  end if;
  return trim(p_order_id);
exception
  when unique_violation then
    select order_id into existing.order_id from commission_paypal_checkouts where request_id = p_request_id;
    if existing.order_id is not null then
      return existing.order_id;
    end if;
    raise exception 'not_payable';
end;
$$;

create or replace function public.begin_commission_paypal_capture(p_order_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  checkout commission_paypal_checkouts;
  req commission_requests;
begin
  if p_order_id is null or length(trim(p_order_id)) = 0 then
    raise exception 'order_not_found';
  end if;

  select request_id into req.id from commission_paypal_checkouts where order_id = trim(p_order_id);
  if not found then
    raise exception 'order_not_found';
  end if;
  select * into req from commission_requests where id = req.id for update;
  if not found then
    raise exception 'not_payable';
  end if;
  select * into checkout from commission_paypal_checkouts where request_id = req.id for update;
  if not found or checkout.order_id is distinct from trim(p_order_id) then
    raise exception 'order_not_found';
  end if;

  if checkout.capture_disposition = 'matched' then
    return 'done';
  end if;
  if checkout.capture_disposition in ('held', 'uncertain') or checkout.capture_pending then
    return 'pending';
  end if;
  if req.status <> 'awaiting_payment' then
    raise exception 'not_payable';
  end if;
  if checkout.capture_pending then
    return 'pending';
  end if;

  update commission_paypal_checkouts
  set capture_pending = true
  where order_id = checkout.order_id and capture_id is null and capture_pending = false;
  if not found then
    return 'pending';
  end if;
  return 'ready';
end;
$$;

create or replace function public.release_commission_paypal_capture(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A stored capture id or a held result is not a proven non-charge.
  update commission_paypal_checkouts
  set capture_pending = false
  where order_id = trim(p_order_id)
    and capture_id is null
    and provider_evidence is null
    and capture_disposition = 'open';
end;
$$;

create or replace function public.hold_commission_paypal_capture(
  p_order_id text,
  p_capture_id text,
  p_evidence text,
  p_kind text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  req commission_requests;
  checkout commission_paypal_checkouts;
  kind text;
  note text;
begin
  if p_kind = 'held' then
    kind := 'held';
  else
    kind := 'uncertain';
  end if;
  note := coalesce(nullif(trim(p_evidence), ''), 'uncertain');

  select request_id into req.id from commission_paypal_checkouts where order_id = trim(p_order_id);
  if not found then
    raise exception 'order_not_found';
  end if;
  select * into req from commission_requests where id = req.id for update;
  if not found then
    raise exception 'not_payable';
  end if;
  select * into checkout from commission_paypal_checkouts where request_id = req.id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if checkout.capture_disposition = 'matched' then
    return 'matched';
  end if;

  update commission_paypal_checkouts
  set capture_pending = true,
      capture_disposition = case
        when capture_disposition = 'held' then 'held'
        when kind = 'held' then 'held'
        else 'uncertain'
      end,
      provider_evidence = left(coalesce(provider_evidence || ' | ', '') || note, 2000),
      capture_id = case
        when capture_id is not null then capture_id
        when p_capture_id is null or length(trim(p_capture_id)) = 0 then capture_id
        else trim(p_capture_id)
      end
  where request_id = checkout.request_id;
  return case when checkout.capture_disposition = 'held' or kind = 'held' then 'held' else 'uncertain' end;
end;
$$;

create or replace function public.complete_commission_paypal_capture(
  p_order_id text,
  p_capture_id text,
  p_amount text,
  p_currency text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  checkout commission_paypal_checkouts;
  req commission_requests;
  amount numeric;
begin
  if p_capture_id is null or length(trim(p_capture_id)) = 0 or p_order_id is null or length(trim(p_order_id)) = 0 then
    raise exception 'invalid_capture';
  end if;
  begin
    amount := trim(p_amount)::numeric;
  exception when others then
    raise exception 'amount_mismatch';
  end;

  select request_id into req.id from commission_paypal_checkouts where order_id = trim(p_order_id);
  if not found then
    raise exception 'order_not_found';
  end if;
  select * into req from commission_requests where id = req.id for update;
  if not found then
    raise exception 'not_payable';
  end if;
  select * into checkout from commission_paypal_checkouts where request_id = req.id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if checkout.capture_disposition = 'matched' then
    if checkout.capture_id = trim(p_capture_id) then
      return 'duplicate';
    end if;
    raise exception 'capture_mismatch';
  end if;
  -- A safety hold is not cleared by a later amount match.
  if checkout.capture_disposition = 'held' then
    return 'held';
  end if;
  -- A configured merchant is not proven by a missing payee or by amount agreement.
  if checkout.expected_merchant is not null and checkout.merchant_proven is not true then
    return 'held';
  end if;

  if p_currency is distinct from 'USD'
     or amount is null
     or amount <= 0
     or checkout.currency is distinct from 'USD'
     or checkout.amount <> amount
     or req.currency is distinct from 'USD'
     or req.final_price is null
     or req.final_price <> amount
     or req.status <> 'awaiting_payment' then
    update commission_paypal_checkouts
    set capture_pending = true,
        capture_disposition = case when capture_disposition = 'matched' then 'matched' else 'held' end,
        capture_id = case
          when capture_id is not null then capture_id
          else trim(p_capture_id)
        end,
        provider_evidence = left(coalesce(provider_evidence || ' | ', '') || p_currency || ' ' || coalesce(p_amount, ''), 2000)
    where request_id = checkout.request_id and capture_disposition is distinct from 'matched';
    if checkout.capture_disposition = 'matched' and checkout.capture_id = trim(p_capture_id) then
      return 'duplicate';
    end if;
    return 'held';
  end if;

  if checkout.capture_id is not null and checkout.capture_id <> trim(p_capture_id) then
    raise exception 'capture_mismatch';
  end if;

  update commission_paypal_checkouts
  set capture_id = trim(p_capture_id),
      captured_at = coalesce(captured_at, now()),
      capture_pending = false,
      capture_disposition = 'matched'
  where request_id = checkout.request_id;

  update commission_requests
  set status = 'in_progress', paid_at = coalesce(paid_at, now())
  where id = req.id and status = 'awaiting_payment';

  if checkout.capture_disposition = 'matched' then
    return 'duplicate';
  end if;
  return 'completed';
end;
$$;

create or replace function public.mark_commission_paid_manual(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  req commission_requests;
  checkout commission_paypal_checkouts;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  select * into req from commission_requests where id = p_request_id for update;
  if not found then
    raise exception 'not_payable';
  end if;

  select * into checkout from commission_paypal_checkouts where request_id = p_request_id for update;
  if found and checkout.capture_disposition = 'matched' then
    raise exception 'capture_recorded';
  end if;
  if found and (checkout.capture_pending or checkout.capture_disposition = 'held' or checkout.capture_id is not null) then
    raise exception 'capture_in_progress';
  end if;
  if req.status <> 'awaiting_payment' then
    raise exception 'not_payable';
  end if;

  update commission_requests
  set status = 'in_progress', paid_at = now()
  where id = req.id and status = 'awaiting_payment';
  if not found then
    raise exception 'not_payable';
  end if;
  return 'advanced';
end;
$$;

create or replace function public.admin_cancel_commission_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req commission_requests;
  checkout commission_paypal_checkouts;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  select * into req from commission_requests where id = p_request_id for update;
  if not found or req.status in ('completed', 'declined', 'cancelled') then
    raise exception 'not_payable';
  end if;

  select * into checkout from commission_paypal_checkouts where request_id = p_request_id for update;
  if found and (checkout.capture_pending or checkout.capture_disposition <> 'open' or checkout.capture_id is not null) then
    raise exception 'capture_in_progress';
  end if;

  update commission_requests set status = 'cancelled' where id = req.id;
  if req.status <> 'pending' and req.service_id is not null then
    update services set slots_taken = greatest(0, slots_taken - 1) where id = req.service_id;
  end if;
end;
$$;

create or replace function public.cancel_commission_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r commission_requests;
  checkout commission_paypal_checkouts;
begin
  select * into r from commission_requests where id = p_request_id and client_id = auth.uid() for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if r.status not in ('pending', 'awaiting_payment') then
    raise exception 'cannot_cancel';
  end if;

  select * into checkout from commission_paypal_checkouts where request_id = r.id for update;
  if found and (checkout.capture_pending or checkout.capture_disposition <> 'open' or checkout.capture_id is not null) then
    raise exception 'capture_in_progress';
  end if;

  update commission_requests set status = 'cancelled' where id = r.id;
  if r.status = 'awaiting_payment' and r.service_id is not null then
    update services set slots_taken = greatest(0, slots_taken - 1) where id = r.service_id;
  end if;
end;
$$;

create or replace function public.guard_commission_request_paypal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  checkout commission_paypal_checkouts;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  -- The request row is already locked by this update. Lock the checkout next.
  select * into checkout from commission_paypal_checkouts where request_id = old.id for update;
  if not found then
    return new;
  end if;
  if checkout.capture_pending or checkout.capture_disposition in ('held', 'uncertain') then
    raise exception 'capture_in_progress';
  end if;
  if checkout.capture_disposition = 'matched' and new.status in ('cancelled', 'declined', 'pending', 'awaiting_payment') then
    raise exception 'capture_recorded';
  end if;
  return new;
end;
$$;

drop trigger if exists commission_requests_paypal_guard on commission_requests;
create trigger commission_requests_paypal_guard
  before update on commission_requests
  for each row execute function public.guard_commission_request_paypal();

create or replace function public.note_commission_paypal_merchant(p_order_id text, p_merchant text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req commission_requests;
  checkout commission_paypal_checkouts;
begin
  if p_merchant is null or length(trim(p_merchant)) = 0 then
    return;
  end if;
  select request_id into req.id from commission_paypal_checkouts where order_id = trim(p_order_id);
  if not found then
    raise exception 'order_not_found';
  end if;
  select * into req from commission_requests where id = req.id for update;
  if not found then
    raise exception 'not_payable';
  end if;
  select * into checkout from commission_paypal_checkouts where request_id = req.id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  update commission_paypal_checkouts
  set expected_merchant = trim(p_merchant)
  where request_id = checkout.request_id and expected_merchant is null;
end;
$$;

create or replace function public.prove_commission_paypal_merchant(p_order_id text, p_merchant text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  req commission_requests;
  checkout commission_paypal_checkouts;
begin
  select request_id into req.id from commission_paypal_checkouts where order_id = trim(p_order_id);
  if not found then
    raise exception 'order_not_found';
  end if;
  select * into req from commission_requests where id = req.id for update;
  if not found then
    raise exception 'not_payable';
  end if;
  select * into checkout from commission_paypal_checkouts where request_id = req.id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if checkout.expected_merchant is null then
    return 'unconfigured';
  end if;
  if p_merchant is not null and trim(p_merchant) = checkout.expected_merchant then
    update commission_paypal_checkouts set merchant_proven = true where request_id = checkout.request_id;
    return 'proven';
  end if;
  return 'rejected';
end;
$$;

revoke all on function public.reserve_commission_paypal_order(uuid, text, text) from public;
revoke all on function public.note_commission_paypal_merchant(text, text) from public;
revoke all on function public.prove_commission_paypal_merchant(text, text) from public;
revoke all on function public.hold_commission_paypal_capture(text, text, text, text) from public;
revoke all on function public.guard_commission_request_paypal() from public;
revoke all on function public.attach_commission_paypal_order(uuid, text, text, text) from public;
revoke all on function public.begin_commission_paypal_capture(text) from public;
revoke all on function public.release_commission_paypal_capture(text) from public;
revoke all on function public.complete_commission_paypal_capture(text, text, text, text) from public;
revoke all on function public.mark_commission_paid_manual(uuid) from public;
revoke all on function public.admin_cancel_commission_request(uuid) from public;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.reserve_commission_paypal_order(uuid, text, text) from anon;
    revoke all on function public.attach_commission_paypal_order(uuid, text, text, text) from anon;
    revoke all on function public.begin_commission_paypal_capture(text) from anon;
    revoke all on function public.release_commission_paypal_capture(text) from anon;
    revoke all on function public.complete_commission_paypal_capture(text, text, text, text) from anon;
    revoke all on function public.hold_commission_paypal_capture(text, text, text, text) from anon;
    revoke all on function public.note_commission_paypal_merchant(text, text) from anon;
    revoke all on function public.prove_commission_paypal_merchant(text, text) from anon;
    revoke all on function public.mark_commission_paid_manual(uuid) from anon;
    revoke all on function public.admin_cancel_commission_request(uuid) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.reserve_commission_paypal_order(uuid, text, text) from authenticated;
    revoke all on function public.attach_commission_paypal_order(uuid, text, text, text) from authenticated;
    revoke all on function public.begin_commission_paypal_capture(text) from authenticated;
    revoke all on function public.release_commission_paypal_capture(text) from authenticated;
    revoke all on function public.complete_commission_paypal_capture(text, text, text, text) from authenticated;
    revoke all on function public.hold_commission_paypal_capture(text, text, text, text) from authenticated;
    revoke all on function public.note_commission_paypal_merchant(text, text) from authenticated;
    revoke all on function public.prove_commission_paypal_merchant(text, text) from authenticated;
    grant execute on function public.mark_commission_paid_manual(uuid) to authenticated;
    grant execute on function public.admin_cancel_commission_request(uuid) to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.reserve_commission_paypal_order(uuid, text, text) to service_role;
    grant execute on function public.attach_commission_paypal_order(uuid, text, text, text) to service_role;
    grant execute on function public.begin_commission_paypal_capture(text) to service_role;
    grant execute on function public.release_commission_paypal_capture(text) to service_role;
    grant execute on function public.complete_commission_paypal_capture(text, text, text, text) to service_role;
    grant execute on function public.hold_commission_paypal_capture(text, text, text, text) to service_role;
    grant execute on function public.note_commission_paypal_merchant(text, text) to service_role;
    grant execute on function public.prove_commission_paypal_merchant(text, text) to service_role;
  end if;
end $$;
