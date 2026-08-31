-- Real user-submitted ratings/reviews, replacing the bulk-imported Google
-- rating carried over at seed time. A cafe's displayed rating is now always
-- computed from this table (average of real reviews), never from an
-- external source.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references cafes(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  reviewer_name text,
  created_at timestamptz default now()
);

create index if not exists reviews_cafe_id_idx on reviews(cafe_id);

-- MVP: no auth yet, open read/write like the other tables — anyone can
-- leave a review (no login exists to gate it behind).
alter table reviews enable row level security;

create policy "reviews are publicly readable" on reviews for select using (true);
create policy "reviews are publicly writable (MVP)" on reviews for insert with check (true);
