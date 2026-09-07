-- Completes the move of bookmarks/collections/points/visited off
-- per-browser localStorage (lib/useBookmarks.ts, useCollections.ts,
-- usePoints.ts, useVisitTracking.ts) onto real per-user tables, now that
-- Google sign-in (0024) gives every user a stable identity to scope data
-- to. 0008 already created bookmarks/collections/collection_cafes/
-- points_ledger for this; this migration adds the missing visited_cafes
-- table and fixes points_ledger's reason constraint, which predates the
-- app's current design.

create table if not exists public.visited_cafes (
  user_id uuid not null references auth.users(id) on delete cascade,
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cafe_id)
);

create index if not exists visited_cafes_user_id_idx on public.visited_cafes(user_id);

alter table public.visited_cafes enable row level security;

drop policy if exists "users read their own visited cafes" on public.visited_cafes;
create policy "users read their own visited cafes" on public.visited_cafes
  for select using (auth.uid() = user_id);

drop policy if exists "users insert their own visited cafes" on public.visited_cafes;
create policy "users insert their own visited cafes" on public.visited_cafes
  for insert with check (auth.uid() = user_id);

drop policy if exists "users delete their own visited cafes" on public.visited_cafes;
create policy "users delete their own visited cafes" on public.visited_cafes
  for delete using (auth.uid() = user_id);

-- points_ledger's original reason check (0008) only allowed the old
-- per-field reasons ('rate','comment','photo','favorite_food') from a
-- design usePoints.ts moved away from before the table was ever actually
-- used — the app has only ever awarded a single flat 'review' reward.
-- No rows exist yet (points_ledger was never wired to the database
-- before now), so this is a straight replacement, not a data migration.
-- Finds the constraint by inspecting pg_constraint rather than assuming
-- Postgres's default auto-generated name, since that's just a naming
-- convention, not a guarantee.
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

alter table public.points_ledger add constraint points_ledger_reason_check check (reason in ('review'));
