-- Self-service admin password recovery. An admin sets two secret 10-digit
-- numbers out-of-band (scripts/set-admin-recovery.mjs); to reset a
-- forgotten password later, they re-enter the first 5 and last 5 digits
-- of each number. Only a single salted hash of the combined 20-digit
-- code is ever stored — the raw numbers never touch the database, and
-- there's no way to recover them from the hash, only to verify a
-- resubmitted code against it (see lib/recoveryCode.ts).
--
-- Deliberately NO row level security policies at all (not even a
-- self-select one like `admins` has) — this table is only ever touched
-- server-side with the service role, from app/api/admin/reset-password
-- and the setup script. A signed-in user has no path to read or write
-- their own row through the anon/authenticated API.
create table if not exists public.admin_recovery (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_recovery enable row level security;
