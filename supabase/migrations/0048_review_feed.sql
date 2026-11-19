-- Review feed: newest first, with one review you can pin.
--
-- The public site now lists reviews by date (when the client wrote it, or
-- when a hand-added quote was entered) instead of the manual sort_order.
-- `featured` lets the artist pin one review to lead the home page; every
-- other review follows newest first. At most one review is pinned at a time.
--
-- The guard trigger from 0033 doesn't touch `featured`, so the admin can pin
-- a verified review without changing the client's words or rating. A review
-- the client kept private can't be published, so pinning it shows nothing.
--
-- Additive and safe to run again.

alter table testimonials
  add column if not exists featured boolean not null default false;

create unique index if not exists testimonials_one_featured
  on testimonials ((true))
  where featured;
