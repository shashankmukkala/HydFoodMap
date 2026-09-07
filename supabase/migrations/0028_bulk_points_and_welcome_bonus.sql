-- Three things for admin points management (app/admin/users):
--   1. A 'welcome_bonus' reason on points_ledger, alongside 'review'/'bonus'
--      (0025/0026), for the automatic new-signup bonus below.
--   2. `type`/`amount` on notifications (0027) so the client can tell a
--      welcome-bonus notification apart from a plain one and show it as a
--      celebratory card instead of just a bell-dropdown line.
--   3. A single-row `welcome_bonus_config` table an admin toggles/edits
--      (app/api/admin/welcome-bonus) and `handle_new_user()` (0024) reads
--      at signup time, so a new account can be auto-credited without any
--      client-side involvement — a user could otherwise just never open
--      the app long enough to be caught by a client-side check.

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.points_ledger'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%reason%'
  loop
    execute format('alter table public.points_ledger drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.points_ledger add constraint points_ledger_reason_check
  check (reason in ('review', 'bonus', 'welcome_bonus'));

alter table public.notifications add column if not exists type text not null default 'info';
alter table public.notifications add column if not exists amount integer;

-- Singleton config row (id is always 1) — simpler for a single admin
-- operator than a multi-row settings table, and matches how this app
-- already treats "the admin" as one trusted account rather than a role
-- with many holders.
create table if not exists public.welcome_bonus_config (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  amount integer not null default 0,
  message text,
  starts_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.welcome_bonus_config (id) values (1) on conflict (id) do nothing;

alter table public.welcome_bonus_config enable row level security;
-- No policies at all, same as admin_recovery (0023) — read/write only
-- through the service-role client in app/api/admin/welcome-bonus and
-- through handle_new_user() below (security definer, bypasses RLS).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg record;
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;

  select * into cfg from public.welcome_bonus_config where id = 1;
  if cfg.enabled and cfg.amount > 0
     and (cfg.starts_at is null or new.created_at >= cfg.starts_at)
     and (cfg.ends_at is null or new.created_at <= cfg.ends_at)
  then
    insert into public.points_ledger (user_id, amount, reason)
    values (new.id, cfg.amount, 'welcome_bonus');

    insert into public.notifications (user_id, message, type, amount)
    values (
      new.id,
      coalesce(cfg.message, 'Welcome to HydCafeMap!'),
      'welcome_bonus',
      cfg.amount
    );
  end if;

  return new;
end;
$$;
