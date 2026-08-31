-- Real happenings in Hyderabad (workshops, pop-ups, etc.) — admin-curated,
-- not tied to a map coordinate. Replaces the old "recently pinned cafes"
-- panel with something that actually needs its own content.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  location text,
  description text,
  created_at timestamptz default now()
);

-- MVP: no auth yet, so this stays open for read/write like cafes/billboards.
-- Lock down with real RLS policies before real users touch it.
alter table events enable row level security;

create policy "events are publicly readable" on events for select using (true);
create policy "events are publicly writable (MVP)" on events for insert with check (true);
create policy "events are publicly updatable (MVP)" on events for update using (true);
create policy "events are publicly deletable (MVP)" on events for delete using (true);
