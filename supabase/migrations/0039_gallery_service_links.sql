-- Gallery images become the single source of service samples, VGen-style.
--
-- An image in /gallery can now be filed under one or more services. Those
-- services show it in their sample grid automatically, so the same artwork is
-- uploaded once instead of once per place it appears. Each image can also say
-- who it was made for and carry a client review.
--
--   service_ids     services this image is a sample of (published or not; the
--                   site only reads the published ones)
--   client_name     "Made for …" credit. Optional, shown as plain text.
--   testimonial_id  a review to show with the image. The "Verified" mark is
--                   never stored here: it comes from the linked review itself
--                   (a review is verified when a client wrote it from a
--                   completed order — see 0033). The public can only read
--                   published reviews, so a draft or private review linked
--                   here simply doesn't appear.
--
-- Additive only: no drops, no deletes. services.samples stays for anything
-- that isn't in the gallery (videos, process shots).

alter table gallery_items
  add column if not exists service_ids uuid[] not null default '{}',
  add column if not exists client_name text,
  add column if not exists testimonial_id uuid references testimonials (id) on delete set null;

-- "Which images are samples of this service?" is an array-contains lookup.
create index if not exists gallery_items_service_ids_idx on gallery_items using gin (service_ids);

-- A service that is deleted should stop being listed on its old images.
create or replace function public.gallery_forget_service()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update gallery_items
    set service_ids = array_remove(service_ids, old.id)
    where old.id = any (service_ids);
  return old;
end;
$$;

revoke all on function public.gallery_forget_service() from public;
revoke all on function public.gallery_forget_service() from anon;
revoke all on function public.gallery_forget_service() from authenticated;

drop trigger if exists services_forget_in_gallery on services;
create trigger services_forget_in_gallery
  after delete on services
  for each row execute function public.gallery_forget_service();
