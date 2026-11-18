-- Discord discount roles, edited from the admin dashboard (/admin/discord).
--
-- Before this, the roles and their percents lived in the DISCORD_DISCOUNT_ROLES
-- environment variable, so changing a percent meant a Vercel redeploy. Now the
-- admin picks a percent per server role and the server reads this table on
-- every role check.
--
-- One row per Discord role the admin has saved. percent = 0 means "no
-- discount" and is kept on purpose: while the table has any row, it is the
-- source of truth and the environment variable is ignored. An empty table
-- (never saved) falls back to the environment variable, so nothing changes
-- until the admin saves the page for the first time.
--
-- The request trigger (apply_discord_discount) is unchanged: it still reads
-- the percent the server stored on client_discord_links at the last role check.

create table if not exists discord_discount_roles (
  role_id text primary key check (role_id ~ '^[0-9]{15,25}$'),
  role_name text not null default '',
  percent numeric(5, 2) not null default 0
    check (percent >= 0 and percent <= 50),
  updated_at timestamptz not null default now()
);

alter table discord_discount_roles enable row level security;

-- Admins manage the list; the server reads it with the service-role key.
-- Clients never see it (the profile page shows only their own result).
drop policy if exists "admin manage discord discount roles" on discord_discount_roles;
create policy "admin manage discord discount roles" on discord_discount_roles
  for all using (public.is_admin()) with check (public.is_admin());
