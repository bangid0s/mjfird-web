-- A delivered commission can put its final image in the gallery by itself:
-- when the client said the work may be shared ("Yes" or "final piece is OK",
-- never "NDA"), marking the request Delivered copies the first delivered
-- image into the public media bucket and adds a gallery item for it.
--
-- request_id ties that item back to its order, so it is made only once per
-- order, and the client's review (once they write it with public consent and
-- it is approved) shows with it. Deleting the order keeps the artwork.

alter table public.gallery_items
  add column if not exists request_id uuid references public.commission_requests (id) on delete set null;

create unique index if not exists gallery_items_request_key
  on public.gallery_items (request_id)
  where request_id is not null;
