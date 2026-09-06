-- A review must be tied to a short-lived check-in created for the signed-in
-- user. Coordinates are still checked by the API, but are no longer the only
-- proof carried by a review request.
create table if not exists review_checkins (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  used_at timestamptz,
  start_lat double precision not null,
  start_lng double precision not null,
  start_accuracy double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists review_checkins_user_cafe_idx
  on review_checkins(user_id, cafe_id, created_at desc);

alter table reviews add column if not exists checkin_id uuid references review_checkins(id) on delete set null;
create unique index if not exists reviews_one_per_checkin on reviews(checkin_id)
  where checkin_id is not null;

alter table review_checkins enable row level security;

create policy "users read their own checkins" on review_checkins
  for select using (auth.uid() = user_id);

create policy "users create their own checkins" on review_checkins
  for insert with check (auth.uid() = user_id);

create policy "users update their own checkins" on review_checkins
  for update using (auth.uid() = user_id);
