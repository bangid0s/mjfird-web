-- In-site notifications: the bell in the nav.
--
-- Every row is written by a trigger, never by the browser, so a client can't
-- forge one. Clients hear about their own orders (accepted, payment link,
-- paid, files added, delivered, completed, declined, cancelled, new message,
-- review published). Admins hear about studio activity (new request, client
-- message, payment, client cancel, new review).
--
-- Nobody is told about their own action: rows for auth.uid() are skipped.
-- Safe to run again.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  href text not null default '/account',
  request_id uuid references commission_requests (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id) where read_at is null;

alter table notifications enable row level security;

drop policy if exists "read own notifications" on notifications;
create policy "read own notifications" on notifications
  for select using (user_id = auth.uid());
-- No insert/update/delete policies: writes go through the triggers and
-- mark_notifications_read() below.

-- ---------- helpers ----------
create or replace function public.notify_user(
  p_user uuid, p_kind text, p_title text, p_body text, p_href text, p_request uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or p_user is not distinct from auth.uid() then
    return;
  end if;
  insert into notifications (user_id, kind, title, body, href, request_id)
  values (p_user, p_kind, left(p_title, 200), left(coalesce(p_body, ''), 300), p_href, p_request);
end;
$$;

create or replace function public.notify_admins(
  p_kind text, p_title text, p_body text, p_href text, p_request uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  for a in select user_id from admins loop
    perform public.notify_user(a.user_id, p_kind, p_title, p_body, p_href, p_request);
  end loop;
end;
$$;

-- One line from a message body for the preview.
create or replace function public.notification_snippet(p_text text)
returns text
language sql
immutable
as $$
  select case
    when char_length(flat) > 140 then left(flat, 139) || '…'
    else flat
  end
  from (select trim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')) as flat) s;
$$;

-- ---------- requests ----------
create or replace function public.notify_commission_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_label text := '#' || new.ref::text;
  client_href text := '/account/requests/' || new.id::text;
  admin_href text := '/admin/requests/' || new.id::text;
  files_added boolean;
begin
  if tg_op = 'INSERT' then
    perform public.notify_admins(
      'request_new',
      'New request ' || ref_label,
      new.contact_name || ' requested ' || new.service_title || ' — ' || new.package_name || '.',
      admin_href, new.id
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'awaiting_payment' then
        perform public.notify_user(new.client_id, 'request_accepted',
          'Request ' || ref_label || ' accepted',
          case when new.payment_url is not null
            then 'Your ' || new.service_title || ' was accepted. Payment is open on your request page.'
            else 'Your ' || new.service_title || ' was accepted. Payment details are on the way.'
          end,
          client_href, new.id);
      when 'declined' then
        perform public.notify_user(new.client_id, 'request_declined',
          'Update on request ' || ref_label,
          'Your request for ' || new.service_title || ' couldn''t be taken on this time.',
          client_href, new.id);
      when 'in_progress' then
        perform public.notify_user(new.client_id, 'request_paid',
          'Work has started on ' || ref_label,
          'Payment confirmed for ' || new.service_title || '. Your commission is in progress.',
          client_href, new.id);
        perform public.notify_admins('request_paid',
          'Paid: ' || ref_label,
          new.contact_name || ' paid for ' || new.service_title || '.',
          admin_href, new.id);
      when 'delivered' then
        perform public.notify_user(new.client_id, 'request_delivered',
          'Your ' || new.service_title || ' is ready',
          'Files for ' || ref_label || ' are ready to download.',
          client_href, new.id);
      when 'completed' then
        perform public.notify_user(new.client_id, 'request_completed',
          'Completed: ' || ref_label,
          'Thank you! You can leave a short review from your request page.',
          client_href, new.id);
      when 'cancelled' then
        if auth.uid() is not distinct from new.client_id then
          perform public.notify_admins('request_cancelled',
            ref_label || ' cancelled by client',
            new.contact_name || ' cancelled their request for ' || new.service_title || '.',
            admin_href, new.id);
        else
          perform public.notify_user(new.client_id, 'request_cancelled',
            'Request ' || ref_label || ' cancelled',
            'Your request for ' || new.service_title || ' was cancelled.',
            client_href, new.id);
        end if;
      else
        null;
    end case;
    return new;
  end if;

  -- Same status: payment link or files changed.
  if new.status = 'awaiting_payment'
     and new.payment_url is not null
     and new.payment_url is distinct from old.payment_url then
    perform public.notify_user(new.client_id, 'payment_ready',
      'Payment is ready for ' || ref_label,
      'You can now pay for ' || new.service_title || ' from your request page.',
      client_href, new.id);
  end if;

  files_added :=
    coalesce(array_length(new.delivery_paths, 1), 0) > coalesce(array_length(old.delivery_paths, 1), 0)
    or (new.delivery_url is not null and new.delivery_url is distinct from old.delivery_url);
  if files_added then
    perform public.notify_user(new.client_id, 'files_added',
      'New files on ' || ref_label,
      'New files were added to your ' || new.service_title || '.',
      client_href, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists commission_requests_notify on commission_requests;
create trigger commission_requests_notify
  after insert or update on commission_requests
  for each row execute function public.notify_commission_request();

-- ---------- messages ----------
create or replace function public.notify_commission_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r commission_requests;
begin
  select * into r from commission_requests where id = new.request_id;
  if not found then
    return new;
  end if;

  if new.from_admin then
    perform public.notify_user(r.client_id, 'message',
      'New message on #' || r.ref::text,
      public.notification_snippet(new.body),
      '/account/requests/' || r.id::text, r.id);
  else
    perform public.notify_admins('message',
      r.contact_name || ' wrote on #' || r.ref::text,
      public.notification_snippet(new.body),
      '/admin/requests/' || r.id::text, r.id);
  end if;
  return new;
end;
$$;

drop trigger if exists commission_messages_notify on commission_messages;
create trigger commission_messages_notify
  after insert on commission_messages
  for each row execute function public.notify_commission_message();

-- ---------- reviews ----------
create or replace function public.notify_commission_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r commission_requests;
begin
  if new.request_id is null then
    return new;
  end if;
  select * into r from commission_requests where id = new.request_id;
  if not found then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.notify_admins('review_new',
      'New review on #' || r.ref::text,
      r.contact_name || ' reviewed ' || r.service_title || '. It''s waiting for approval.',
      '/admin/testimonials', r.id);
  elsif new.status = 'published' and old.status is distinct from 'published' then
    perform public.notify_user(r.client_id, 'review_published',
      'Your review is live',
      'Thanks for reviewing ' || r.service_title || ' — it''s now on the site.',
      '/account/requests/' || r.id::text, r.id);
  end if;
  return new;
end;
$$;

drop trigger if exists testimonials_notify on testimonials;
create trigger testimonials_notify
  after insert or update of status on testimonials
  for each row execute function public.notify_commission_review();

-- ---------- mark read ----------
-- p_ids null and p_request_id null: everything. Otherwise only those ids, or
-- only rows for that request.
create or replace function public.mark_notifications_read(
  p_ids uuid[] default null,
  p_request_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  update notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (p_ids is null or id = any (p_ids))
    and (p_request_id is null or request_id = p_request_id);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.notify_user(uuid, text, text, text, text, uuid) from public;
revoke all on function public.notify_admins(text, text, text, text, uuid) from public;
revoke all on function public.notify_commission_request() from public;
revoke all on function public.notify_commission_message() from public;
revoke all on function public.notify_commission_review() from public;
revoke all on function public.mark_notifications_read(uuid[], uuid) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.notify_user(uuid, text, text, text, text, uuid) from anon;
    revoke all on function public.notify_admins(text, text, text, text, uuid) from anon;
    revoke all on function public.mark_notifications_read(uuid[], uuid) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.notify_user(uuid, text, text, text, text, uuid) from authenticated;
    revoke all on function public.notify_admins(text, text, text, text, uuid) from authenticated;
    grant execute on function public.mark_notifications_read(uuid[], uuid) to authenticated;
  end if;
end $$;

-- ---------- live updates ----------
-- Supabase Realtime only streams tables in this publication. RLS still
-- applies, so each browser only receives its own rows.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
