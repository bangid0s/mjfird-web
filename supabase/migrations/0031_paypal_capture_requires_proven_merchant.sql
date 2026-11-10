-- Defense in depth after 0030. Replaces only complete_commission_paypal_capture.
-- Apply to an isolated database that already has 0030. Safe to run again.
-- Does not update, insert, or delete existing rows.

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
  -- A capture is not paid until the payee has been proven, including when no merchant was stored.
  if checkout.merchant_proven is not true then
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

revoke all on function public.complete_commission_paypal_capture(text, text, text, text) from public;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.complete_commission_paypal_capture(text, text, text, text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.complete_commission_paypal_capture(text, text, text, text) from authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.complete_commission_paypal_capture(text, text, text, text) to service_role;
  end if;
end $$;
