-- "Visited" used to be a blind, unverified self-report toggle
-- (visited_cafes had an open insert/delete policy — any signed-in user
-- could mark any cafe visited or not with zero proof, and only the
-- *first* visit ever paid out anything). That made repeat visits
-- pointless to reward as-is: nothing stopped someone from toggling a
-- cafe on/off forever to farm points. This migration moves "visited" onto
-- the same GPS check-in + wait + re-verify flow reviews already use
-- (review_checkins, 0014) via a new app/api/cafes/[id]/log-visit route,
-- and adds a real reward for a *genuine* return visit — gated by both
-- location verification and a cooldown, not just a second click.

-- Finds the constraint by inspecting pg_constraint rather than assuming
-- Postgres's auto-generated name, same approach used for points_ledger's
-- reason constraint in 0025/0026/0029 — a naming convention isn't a
-- guarantee.
do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.points_config'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%action%'
  loop
    execute format('alter table public.points_config drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.points_config add constraint points_config_action_check
  check (action in ('review', 'visit', 'photo', 'repeat_visit'));

insert into public.points_config (action, amount, min_amount) values
  ('repeat_visit', 1, 1)
on conflict (action) do nothing;

-- Every individual *verified* visit gets its own row here (unlike
-- visited_cafes, which is a one-row-per-user-per-cafe "have they ever
-- been" flag) — this is what lets a genuine return visit be told apart
-- from the first one, and from analytics' "most visited" ranking.
create table if not exists public.visit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cafe_id uuid not null references public.cafes(id) on delete cascade,
  checkin_id uuid references public.review_checkins(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists visit_log_user_cafe_idx on public.visit_log(user_id, cafe_id, created_at desc);

alter table public.visit_log enable row level security;

drop policy if exists "users read their own visit log" on public.visit_log;
create policy "users read their own visit log" on public.visit_log
  for select using (auth.uid() = user_id);
-- No insert policy — every row is written by app/api/cafes/[id]/log-visit
-- using the service role, only after it has verified the check-in
-- server-side (matching, cafe-scoped, GPS-verified, unexpired, unused).
-- A direct client insert would bypass all of that and reopen exactly the
-- points-farming hole this migration exists to close.

alter table public.points_ledger add column if not exists visit_log_id uuid references public.visit_log(id) on delete set null;

-- The old unverified self-report path — direct client inserts/deletes
-- into visited_cafes with nothing checking they were ever at the cafe.
-- log-visit (service role) is now the only writer; reads stay open so
-- isVisited()/the "visited" badge keep working unchanged.
drop policy if exists "users insert their own visited cafes" on public.visited_cafes;
drop policy if exists "users delete their own visited cafes" on public.visited_cafes;

-- Awards a repeat-visit bonus only when: (a) this isn't the very first
-- visit_log row for this user+cafe (the first one is covered by
-- award_visit_points on visited_cafes' insert instead), and (b) the most
-- recent prior verified visit to this same cafe was at least 20 hours
-- ago — long enough that no one can stand outside re-tapping "verify" for
-- easy repeat rewards, short enough that a genuine visit the next day (or
-- later the same evening) still counts.
create or replace function public.award_repeat_visit_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  repeat_amount integer;
  last_visit timestamptz;
begin
  select max(created_at) into last_visit
  from public.visit_log
  where user_id = new.user_id and cafe_id = new.cafe_id and id != new.id;

  if last_visit is null then
    return new; -- first-ever visit to this cafe — handled by award_visit_points
  end if;

  if now() - last_visit < interval '20 hours' then
    return new; -- too soon to be a genuine return visit
  end if;

  select amount into repeat_amount from public.points_config where action = 'repeat_visit';
  if repeat_amount is not null and repeat_amount > 0 then
    insert into public.points_ledger (user_id, cafe_id, amount, reason, visit_log_id)
    values (new.user_id, new.cafe_id, repeat_amount, 'repeat_visit', new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_visit_logged on public.visit_log;
create trigger on_visit_logged
  after insert on public.visit_log
  for each row execute function public.award_repeat_visit_points();
