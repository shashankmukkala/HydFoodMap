create extension if not exists "pgcrypto";

create table if not exists billboards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  lng double precision not null,
  lat double precision not null,
  elevation_m double precision default 0,
  width_m double precision default 10,
  height_m double precision default 5,
  heading_deg double precision default 0,
  advertiser_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists cafes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  note text,
  lng double precision not null,
  lat double precision not null,
  created_at timestamptz default now()
);

-- MVP: no auth yet, so both tables stay open for read/write.
-- Lock this down with real RLS policies before advertisers/users are onboarded.
alter table billboards enable row level security;
alter table cafes enable row level security;

create policy "billboards are publicly readable" on billboards for select using (true);
create policy "billboards are publicly writable (MVP)" on billboards for insert with check (true);
create policy "billboards are publicly updatable (MVP)" on billboards for update using (true);
create policy "billboards are publicly deletable (MVP)" on billboards for delete using (true);

create policy "cafes are publicly readable" on cafes for select using (true);
create policy "cafes are publicly writable (MVP)" on cafes for insert with check (true);
create policy "cafes are publicly updatable (MVP)" on cafes for update using (true);
create policy "cafes are publicly deletable (MVP)" on cafes for delete using (true);
