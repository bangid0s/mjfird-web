-- Discord account linking + role-based discount for past clients.
--
-- A client links Discord on /account/profile (Supabase identity linking, so the
-- Discord account is proven, not typed in). The server then asks the studio's
-- Discord bot for that member's roles and writes the result here with the
-- service-role key. Clients can read their own row but never write it.
--
-- When a request is created, a trigger reads the row: a verified member holding
-- the Past Client role (discount_percent > 0, synced within the last hour) gets
-- that percent off the estimate. The trigger runs inside the database, so the
-- discount can't be forged from the browser. estimated_total stores the
-- discounted amount; the admin's accept form and PayPal checkout use it as-is.

create table if not exists client_discord_links (
  client_id uuid primary key references auth.users (id) on delete cascade,
  discord_user_id text not null unique,
  discord_username text not null default '',
  in_guild boolean not null default false,
  past_client boolean not null default false,
  discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 50),
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table client_discord_links enable row level security;

drop policy if exists "client read own discord link" on client_discord_links;
create policy "client read own discord link" on client_discord_links
  for select using (client_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: only the server (service role) writes.

alter table commission_requests
  add column if not exists discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 50),
  add column if not exists discount_amount numeric(10, 2) not null default 0
    check (discount_amount >= 0),
  add column if not exists discount_label text;

create or replace function public.apply_discord_discount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  link client_discord_links;
  pct numeric;
  cut numeric;
begin
  select * into link
  from client_discord_links
  where client_id = new.client_id
    and in_guild
    and past_client
    and discount_percent > 0
    and synced_at > now() - interval '1 hour';
  if not found then
    return new;
  end if;

  pct := least(greatest(link.discount_percent, 0), 50);
  cut := round(coalesce(new.estimated_total, 0) * pct / 100, 2);
  if cut <= 0 then
    return new;
  end if;

  new.discount_percent := pct;
  new.discount_amount := cut;
  new.discount_label := 'Past client';
  new.estimated_total := new.estimated_total - cut;
  return new;
end;
$$;

revoke all on function public.apply_discord_discount() from public, anon, authenticated;

drop trigger if exists commission_requests_discord_discount on commission_requests;
create trigger commission_requests_discord_discount
  before insert on commission_requests
  for each row execute function public.apply_discord_discount();
