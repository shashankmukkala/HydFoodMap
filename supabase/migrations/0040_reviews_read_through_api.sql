-- Stop reviews from being readable straight out of the database.
--
-- 0005 gave reviews `for select using (true)` — correct at the time, when
-- a review was an anonymous rating with no identity attached. Since 0009
-- every review carries `user_id`, and since 0014 a review is proof that a
-- named account was physically inside a specific building at a specific
-- time. That is the most sensitive data this product holds, and it was
-- one anonymous PostgREST request away from anyone.
--
-- The exposure was not the review text. It was the join: /api/leaderboard
-- publishes each account's user_id next to its display name, and reviews
-- publish the same user_id next to a cafe and a timestamp. Together they
-- name the author of every review and list the places they have been.
-- Shortening display names on the leaderboard (0039) did not help, because
-- the UUID is the join key, not the name.
--
-- Reviews stay fully public as *content* — they are the product. They are
-- now served through app/api/cafes/[id]/reviews, which returns the rating,
-- text, photo and author display name, and does not return user_id at all.
-- That route reads with the service role, so this policy is not needed for
-- the app to work; dropping it only removes the direct path.
--
-- Note the asymmetry that remains by design: a user can still write their
-- own review (0009's insert policy checks auth.uid() = user_id) and cannot
-- read the raw table back. Writing is theirs; reading is everyone's, and
-- so goes through a route that decides what "everyone" may see.
drop policy if exists "reviews are publicly readable" on public.reviews;

-- Required, not optional. Posting a review inserts and then reads the row
-- back (`.insert(...).select().single()`), and PostgREST's returning
-- clause needs SELECT as well as INSERT — with no select policy at all,
-- dropping the public one above would make every review submission fail
-- after successfully writing the row. Scoped to the author, so this
-- restores the write path without giving anyone a way to read anyone
-- else's reviews.
drop policy if exists "users read their own reviews" on public.reviews;
create policy "users read their own reviews" on public.reviews
  for select using (auth.uid() = user_id);

-- Batch lookup of shortened author names for the reviews route. Reusing
-- public_display_name() (0039) rather than a second shortening rule, so a
-- reviewer is identified the same way on a cafe card as on the
-- leaderboard and neither becomes the weaker link.
--
-- security definer to read profiles across users, which is exactly what
-- the own-row select policy on profiles otherwise prevents; the SELECT is
-- fixed here and returns only the already-shortened name.
create or replace function public.public_display_names(ids uuid[])
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, public.public_display_name(p.display_name)
  from public.profiles p
  where p.user_id = any(ids);
$$;

revoke all on function public.public_display_names(uuid[]) from public;
revoke all on function public.public_display_names(uuid[]) from anon;
revoke all on function public.public_display_names(uuid[]) from authenticated;
grant execute on function public.public_display_names(uuid[]) to service_role;
