-- Moves bookmarks/collections/points off per-browser localStorage
-- (lib/useBookmarks.ts, lib/useCollections.ts, lib/usePoints.ts) onto real
-- tables so they sync across devices. Identity is Supabase Auth's phone
-- OTP sign-in (auth.users) — see lib/useAuth.ts — not a custom users
-- table, so no separate `users` table is needed here.
--
-- Requires an SMS provider (e.g. Twilio) configured under Authentication
-- > Providers > Phone in the Supabase dashboard for OTP delivery to work.

create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cafe_id uuid not null references cafes(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, cafe_id)
);

create index if not exists bookmarks_user_id_idx on bookmarks(user_id);

create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create index if not exists collections_user_id_idx on collections(user_id);

-- Join table: a cafe can be in multiple collections, a collection holds
-- multiple cafes.
create table if not exists collection_cafes (
  collection_id uuid not null references collections(id) on delete cascade,
  cafe_id uuid not null references cafes(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (collection_id, cafe_id)
);

create index if not exists collection_cafes_cafe_id_idx on collection_cafes(cafe_id);

-- Ledger, not a running total column: each row is one earn event (matches
-- the RATE/COMMENT/PHOTO/FAVORITE_FOOD reasons in lib/usePoints.ts), so the
-- balance is always sum(amount) and never drifts from what was actually
-- awarded. review_id ties an earn event back to the review that caused it,
-- where applicable.
create table if not exists points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount smallint not null,
  reason text not null check (reason in ('rate', 'comment', 'photo', 'favorite_food')),
  review_id uuid references reviews(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists points_ledger_user_id_idx on points_ledger(user_id);

-- Real auth exists now (auth.uid()), so these are scoped per-user from the
-- start — unlike cafes/events/reviews/billboards, which predate auth and
-- stay open MVP-style.
alter table bookmarks enable row level security;
alter table collections enable row level security;
alter table collection_cafes enable row level security;
alter table points_ledger enable row level security;

create policy "users read their own bookmarks" on bookmarks
  for select using (auth.uid() = user_id);
create policy "users insert their own bookmarks" on bookmarks
  for insert with check (auth.uid() = user_id);
create policy "users delete their own bookmarks" on bookmarks
  for delete using (auth.uid() = user_id);

create policy "users read their own collections" on collections
  for select using (auth.uid() = user_id);
create policy "users insert their own collections" on collections
  for insert with check (auth.uid() = user_id);
create policy "users update their own collections" on collections
  for update using (auth.uid() = user_id);
create policy "users delete their own collections" on collections
  for delete using (auth.uid() = user_id);

create policy "users read their own collection_cafes" on collection_cafes
  for select using (
    exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid())
  );
create policy "users insert their own collection_cafes" on collection_cafes
  for insert with check (
    exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid())
  );
create policy "users delete their own collection_cafes" on collection_cafes
  for delete using (
    exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid())
  );

create policy "users read their own points_ledger" on points_ledger
  for select using (auth.uid() = user_id);
create policy "users insert their own points_ledger" on points_ledger
  for insert with check (auth.uid() = user_id);
