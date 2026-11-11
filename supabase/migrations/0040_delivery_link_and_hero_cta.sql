-- Delivery drop link + hero buttons that lead with "Commission me".
--
-- 1. commission_requests.delivery_url
--    A Google Drive / Dropbox / WeTransfer link for finished files, set by
--    the admin from the request page and shown to the client next to any
--    uploaded files. Clients keep SELECT on their own rows (0029) and still
--    have no UPDATE, so only the admin can write it. The check mirrors
--    src/lib/commissions/delivery-link.ts: https only, printable ASCII, no
--    credentials, at most 2000 characters.
--
-- 2. Hero buttons
--    The main hero button now goes to /services and the second one to /work.
--    Rows still carrying the original labels ("See the work" / "Start a
--    project") are moved to the new pair so each label matches where it
--    goes. Labels you've already customised are left alone.
--
-- Additive and safe to run again.

alter table public.commission_requests
  add column if not exists delivery_url text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'commission_requests_delivery_url_https'
  ) then
    alter table public.commission_requests
      add constraint commission_requests_delivery_url_https check (
        delivery_url is null
        or (
          char_length(delivery_url) <= 2000
          and delivery_url ~ '^https://[!-~]+$'
          and delivery_url !~ '^https://[^/?#]*@'
        )
      );
  end if;
end $$;

alter table public.site_settings
  alter column hero_cta_primary set default 'Commission me',
  alter column hero_cta_secondary set default 'See the work';

update public.site_settings
  set hero_cta_primary = 'Commission me',
      hero_cta_secondary = 'See the work'
  where hero_cta_primary = 'See the work'
    and hero_cta_secondary = 'Start a project';
