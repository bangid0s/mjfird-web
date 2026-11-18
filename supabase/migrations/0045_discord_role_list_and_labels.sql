-- Discord discounts for more than one role (e.g. Client 5%, VIP Client 10%;
-- the highest wins) and the member's role list for the profile page.
--
-- roles           the member's server roles with names, written by the server
--                 (service role) on every sync: [{ "id", "name", "color" }]
-- discount_label  name of the role that earned the discount, e.g. "VIP Client".
--                 The request trigger copies it onto the request.

alter table client_discord_links
  add column if not exists roles jsonb not null default '[]'::jsonb,
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
  new.discount_label := coalesce(nullif(trim(link.discount_label), ''), 'Client discount');
  new.estimated_total := new.estimated_total - cut;
  return new;
end;
$$;

revoke all on function public.apply_discord_discount() from public, anon, authenticated;
