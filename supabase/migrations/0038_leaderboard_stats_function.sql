-- One aggregated query for the leaderboard, replacing a whole-table scan
-- plus one Admin API call per candidate.
--
-- app/api/leaderboard previously pulled every row of profiles,
-- points_ledger and visited_cafes into Node on every request, summed them
-- in JavaScript, then called auth.admin.getUserById() once per candidate
-- to find out who was banned. That is a full scan of three tables plus
-- ~70 sequential-ish network round trips for a list of 50 names, on a
-- route /profile hits just to show "your rank".
--
-- Postgres can do all of it in one pass, including the ban check —
-- auth.users.banned_until is readable from a security-definer function,
-- so the Admin API is not needed at all.
--
-- security definer because it reads auth.users and aggregates across
-- every user's points; the SELECT is fixed here and exposes only what the
-- leaderboard already showed publicly (display name, avatar, totals).
-- Callers cannot alter the shape of the query.
create or replace function public.leaderboard_stats()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  points bigint,
  visited_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    p.display_name,
    p.avatar_url,
    coalesce(pl.total, 0) as points,
    coalesce(vc.total, 0) as visited_count
  from public.profiles p
  left join (
    select l.user_id, sum(l.amount)::bigint as total
    from public.points_ledger l
    group by l.user_id
  ) pl on pl.user_id = p.user_id
  left join (
    select v.user_id, count(*)::bigint as total
    from public.visited_cafes v
    group by v.user_id
  ) vc on vc.user_id = p.user_id
  join auth.users u on u.id = p.user_id
  where not exists (select 1 from public.admins a where a.user_id = p.user_id)
    and (u.banned_until is null or u.banned_until <= now())
  order by coalesce(pl.total, 0) desc, p.user_id;
$$;

revoke all on function public.leaderboard_stats() from public;
grant execute on function public.leaderboard_stats() to anon, authenticated, service_role;
