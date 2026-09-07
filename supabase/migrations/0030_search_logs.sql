-- Nothing about search was ever persisted before this — SearchBox.tsx
-- matches purely client-side against the already-loaded cafe list, so
-- there was no way to answer "what are people actually searching for"
-- (including searches that found nothing, which is exactly the signal
-- worth having for business decisions — a gap to fill, a cafe to court,
-- an ad slot to sell). This table is written only by
-- app/api/search-logs (service role) — every visitor, signed in or not,
-- can trigger a write, so there's no RLS policy letting a client read or
-- write it directly; aggregation is admin-only (app/api/admin/analytics).
create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  result_count integer not null default 0,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists search_logs_created_at_idx on public.search_logs(created_at);
create index if not exists search_logs_query_idx on public.search_logs(lower(query));

alter table public.search_logs enable row level security;
