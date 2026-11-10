-- Verified reviews.
--
-- A client whose commission is completed can leave a review from their
-- account. It lands in `testimonials` as a draft linked to the request, so the
-- site can mark it "Verified commission". Nothing goes public until the artist
-- approves it, and only if the client agreed to it being shown.
--
-- Rules the database enforces (not just the app):
--   * Only the request's own client, only once it is completed, through
--     submit_commission_review(). Direct API writes can't create or re-link one.
--   * Editing a review sends it back to draft for re-approval.
--   * Admins can't change a verified review's words or rating, and can't
--     publish one the client marked private.
--
-- Additive only: no drops, no deletes.

alter table testimonials
  add column if not exists request_id uuid unique references commission_requests (id) on delete set null,
  add column if not exists service_id uuid references services (id) on delete set null,
  add column if not exists service_title text,
  add column if not exists rating smallint check (rating is null or rating between 1 and 5),
  add column if not exists public_consent boolean not null default false,
  add column if not exists submitted_at timestamptz,
  add column if not exists updated_at timestamptz;

create index if not exists testimonials_service_idx on testimonials (service_id, status);

-- A client can see their own review (any status) on their request page.
drop policy if exists "client read own review" on testimonials;
create policy "client read own review" on testimonials
  for select using (
    request_id is not null
    and exists (
      select 1 from commission_requests r
      where r.id = testimonials.request_id and r.client_id = auth.uid()
    )
  );

-- ---------- guard ----------
-- current_user is 'anon' / 'authenticated' for direct API writes, and the
-- function owner inside submit_commission_review().
create or replace function public.guard_verified_review()
returns trigger
language plpgsql
as $$
declare
  direct boolean := current_user in ('anon', 'authenticated');
begin
  if tg_op = 'INSERT' then
    if direct and new.request_id is not null then
      raise exception 'verified_review_rpc_only';
    end if;
  else
    if direct then
      -- The client's words, rating, consent and link stay as they wrote them.
      new.request_id := old.request_id;
      new.service_id := old.service_id;
      new.service_title := old.service_title;
      if old.request_id is not null then
        new.quote := old.quote;
        new.rating := old.rating;
        new.public_consent := old.public_consent;
        new.submitted_at := old.submitted_at;
      end if;
    end if;
  end if;

  if new.request_id is not null and new.status <> 'draft' and not new.public_consent then
    raise exception 'review_private';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_verified_review() from public;
revoke all on function public.guard_verified_review() from anon;
revoke all on function public.guard_verified_review() from authenticated;

drop trigger if exists testimonials_guard_verified on testimonials;
create trigger testimonials_guard_verified
  before insert or update on testimonials
  for each row execute function public.guard_verified_review();

-- ---------- submit / edit ----------
create or replace function public.submit_commission_review(
  p_request_id uuid,
  p_rating int,
  p_quote text,
  p_name text,
  p_role text,
  p_public boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req record;
  existing uuid;
  q text := btrim(coalesce(p_quote, ''));
  n text := btrim(coalesce(p_name, ''));
  r text := nullif(btrim(coalesce(p_role, '')), '');
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;

  select id, client_id, status, service_id, service_title
    into req
    from commission_requests
    where id = p_request_id and client_id = uid
    for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if req.status <> 'completed' then
    raise exception 'review_not_open';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'invalid_rating';
  end if;
  if char_length(q) < 10 or char_length(q) > 1000 then
    raise exception 'invalid_review';
  end if;
  if char_length(n) < 1 or char_length(n) > 80 then
    raise exception 'invalid_name';
  end if;
  if r is not null and char_length(r) > 80 then
    raise exception 'invalid_role';
  end if;

  select id into existing from testimonials where request_id = req.id for update;

  if existing is null then
    insert into testimonials (
      quote, name, role, rating, public_consent, status, sort_order,
      request_id, service_id, service_title, submitted_at, updated_at
    )
    values (
      q, n, r, p_rating, coalesce(p_public, false), 'draft',
      coalesce((select max(sort_order) + 1 from testimonials), 0),
      req.id, req.service_id, req.service_title, now(), now()
    )
    returning id into existing;
  else
    -- Any edit goes back to the artist for approval.
    update testimonials
      set quote = q,
          name = n,
          role = r,
          rating = p_rating,
          public_consent = coalesce(p_public, false),
          status = 'draft',
          updated_at = now()
      where id = existing;
  end if;

  return existing;
end;
$$;

revoke all on function public.submit_commission_review(uuid, int, text, text, text, boolean) from public;
revoke all on function public.submit_commission_review(uuid, int, text, text, text, boolean) from anon;
grant execute on function public.submit_commission_review(uuid, int, text, text, text, boolean) to authenticated;
