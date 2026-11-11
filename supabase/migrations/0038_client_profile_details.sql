-- Client profile details, editable on /account/profile: region (helps with
-- time zones), Discord username, X handle and one more social link. All
-- optional; handles are stored bare (no "@" or URL). Lengths mirror
-- src/lib/client/profile.ts.

alter table client_profiles
  add column if not exists region text not null default '',
  add column if not exists discord text not null default '',
  add column if not exists x_handle text not null default '',
  add column if not exists social_url text not null default '',
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table client_profiles add constraint client_profiles_details_length check (
    char_length(display_name) <= 120
    and char_length(region) <= 80
    and char_length(discord) <= 40
    and char_length(x_handle) <= 15
    and char_length(social_url) <= 300
    and (social_url = '' or social_url ~* '^https?://')
  ) not valid; -- old rows aren't re-checked; every new write is
exception when duplicate_object then null;
end $$;

-- Clients may change only their own editable fields — not their email,
-- avatar, id or timestamps (RLS already limits them to their own row).
revoke update on client_profiles from authenticated;
grant update (display_name, region, discord, x_handle, social_url) on client_profiles to authenticated;

create or replace function public.touch_client_profile()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists client_profiles_touch on client_profiles;
create trigger client_profiles_touch
  before update on client_profiles
  for each row execute function public.touch_client_profile();
