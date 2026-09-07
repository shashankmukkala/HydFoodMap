-- Stop the public leaderboard from publishing people's real full names.
--
-- profiles.display_name is seeded from Google's own `full_name` at signup
-- (handle_new_user, 0024), and app/api/leaderboard is public — so someone
-- who signed in only to bookmark a cafe had their real name readable by
-- anyone on the internet, with no account and no prompt. Verified against
-- the live database before this migration: an unauthenticated call
-- returned a complete first-and-last name.
--
-- The stored value is left untouched — /profile still shows the user their
-- own name, and they can still edit it. Only what leaves the server on the
-- public ranking is shortened.

-- "Mukkala Shashank" -> "Mukkala S."   (first word, then last word's initial)
-- "CoffeeLover"      -> "CoffeeLover"  (a single word is already a handle;
--                                       shortening it would destroy it)
-- null / whitespace  -> null           (the client already renders a
--                                       placeholder for a missing name)
create or replace function public.public_display_name(raw text)
returns text
language sql
immutable
as $$
  select case
    when n = '' then null
    when strpos(n, ' ') = 0 then n
    else split_part(n, ' ', 1) || ' ' || upper(substr(regexp_replace(n, '^.*\s', ''), 1, 1)) || '.'
  end
  from (select btrim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')) as n) collapsed;
$$;

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
    public.public_display_name(p.display_name) as display_name,
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

-- 0038 granted this to anon and authenticated, which was unnecessary
-- surface: app/api/leaderboard calls it with the service role, so no
-- browser-side role needs to reach it directly. Narrowed to the one role
-- that actually uses it.
revoke all on function public.leaderboard_stats() from public;
revoke all on function public.leaderboard_stats() from anon;
revoke all on function public.leaderboard_stats() from authenticated;
grant execute on function public.leaderboard_stats() to service_role;
