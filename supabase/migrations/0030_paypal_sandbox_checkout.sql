-- PayPal sandbox order/capture binding for an existing commission request.
-- Apply this file only to an isolated database. The app does not run it.
-- One order per request. A capture id can be recorded once. The request moves
-- awaiting_payment -> in_progress only when the captured amount matches final_price
-- and the currency is USD. Approval alone does not call this function.

create table if not exists public.commission_paypal_checkouts (
  request_id uuid primary key references public.commission_requests (id) on delete restrict,
  order_id text not null unique,
  capture_id text unique,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null check (currency = 'USD'),
  created_at timestamptz not null default now(),
  captured_at timestamptz
);

alter table public.commission_paypal_checkouts enable row level security;

create or replace function public.bind_commission_paypal_order(
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
  req commission_requests;
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
    return existing.order_id;
  end if;

  insert into commission_paypal_checkouts (request_id, order_id, amount, currency)
  values (p_request_id, trim(p_order_id), amount, 'USD');
  return trim(p_order_id);
exception
  when unique_violation then
    select * into existing from commission_paypal_checkouts where request_id = p_request_id;
    if found and existing.capture_id is null and existing.amount = amount and existing.currency = 'USD' then
      return existing.order_id;
    end if;
    raise exception 'not_payable';
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
  if p_currency is distinct from 'USD' then
    raise exception 'amount_mismatch';
  end if;

  begin
    amount := trim(p_amount)::numeric;
  exception when others then
    raise exception 'amount_mismatch';
  end;

  select * into checkout from commission_paypal_checkouts where order_id = trim(p_order_id) for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  select * into req from commission_requests where id = checkout.request_id for update;
  if not found then
    raise exception 'not_payable';
  end if;

  if checkout.capture_id is not null then
    if checkout.capture_id = trim(p_capture_id) and req.status <> 'awaiting_payment' then
      return 'duplicate';
    end if;
    if checkout.capture_id <> trim(p_capture_id) then
      raise exception 'capture_mismatch';
    end if;
    raise exception 'not_payable';
  end if;

  if req.status <> 'awaiting_payment' then
    raise exception 'not_payable';
  end if;
  if amount is null
     or amount <= 0
     or req.currency is distinct from 'USD'
     or checkout.currency is distinct from 'USD'
     or req.final_price is null
     or req.final_price <= 0
     or req.final_price <> amount
     or checkout.amount <> amount then
    raise exception 'amount_mismatch';
  end if;

  update commission_paypal_checkouts
  set capture_id = trim(p_capture_id), captured_at = now()
  where order_id = checkout.order_id and capture_id is null;
  if not found then
    raise exception 'not_payable';
  end if;

  update commission_requests
  set status = 'in_progress', paid_at = now()
  where id = req.id and status = 'awaiting_payment';
  if not found then
    raise exception 'not_payable';
  end if;

  return 'completed';
end;
$$;

revoke all on function public.bind_commission_paypal_order(uuid, text, text, text) from public;
revoke all on function public.complete_commission_paypal_capture(text, text, text, text) from public;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.bind_commission_paypal_order(uuid, text, text, text) from anon;
    revoke all on function public.complete_commission_paypal_capture(text, text, text, text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.bind_commission_paypal_order(uuid, text, text, text) from authenticated;
    revoke all on function public.complete_commission_paypal_capture(text, text, text, text) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.bind_commission_paypal_order(uuid, text, text, text) to service_role;
    grant execute on function public.complete_commission_paypal_capture(text, text, text, text) to service_role;
  end if;
end $$;
