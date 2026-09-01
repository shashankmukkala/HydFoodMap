-- Reviews were originally anonymous (open insert, optional free-text
-- reviewer_name) — anyone, including a script hitting the API directly,
-- could post unlimited reviews for any cafe with no identity behind them.
-- That's incompatible with being a genuine review platform: reviews now
-- require a real signed-in identity, and each person can leave at most one
-- review per cafe.
-- Not null: the reviews table has no rows yet at the time this migration
-- was written, so there's nothing to backfill. If that's no longer true by
-- the time you run this, backfill user_id first or drop "not null".
alter table reviews add column if not exists user_id uuid not null references auth.users(id) on delete cascade;

create unique index if not exists reviews_one_per_user_per_cafe on reviews(cafe_id, user_id);

drop policy if exists "reviews are publicly writable (MVP)" on reviews;

create policy "users write their own reviews" on reviews
  for insert with check (auth.uid() = user_id);

create policy "users delete their own reviews" on reviews
  for delete using (auth.uid() = user_id);
