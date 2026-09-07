-- Closes the last of the MVP-era open write policies, and removes review
-- deletion.
--
-- 1) cafes / events / billboards still carried the `with check (true)` /
--    `using (true)` insert-update-delete policies from 0001 and 0003,
--    written before any auth existed. The anon key ships in every browser
--    that loads the site, so anyone could add a cafe, post or delete an
--    event, or publish a billboard, aircraft banner, or rail ad directly
--    against PostgREST — bypassing both the admin console and payment.
--    Verified against the live database: an anon insert on cafes and
--    billboards reached the CHECK constraints (23514), meaning RLS had
--    already let it through, while visited_cafes and points_ledger
--    correctly refused with 42501.
--
--    Reads stay fully public — the map, the ad rail, and the events
--    ticker are for everyone. Only writes move behind is_admin() (0022).
--
-- 2) reviews' delete policy is removed. Deleting a review freed the
--    one-review-per-cafe slot but left the awarded points_ledger rows in
--    place (review_id is ON DELETE SET NULL), and nothing rate-limits
--    check-in creation — so a user sitting inside a cafe could loop
--    check in -> review -> delete -> check in again and collect the full
--    review reward every ~40 seconds. award_visit_points (0029) already
--    guards the visit path this same way, by checking points_ledger
--    rather than a table the user can clear; reviews had no equivalent.

-- Dropping by inspection rather than by the names in 0001/0003: a policy
-- name is a convention, not a guarantee, and this must not silently leave
-- a stale permissive policy behind on the one table it is meant to close.
-- SELECT policies are deliberately left alone.
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('cafes', 'events', 'billboards')
      and cmd <> 'SELECT'
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

create policy "admins insert cafes" on public.cafes
  for insert with check (public.is_admin());
create policy "admins update cafes" on public.cafes
  for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete cafes" on public.cafes
  for delete using (public.is_admin());

create policy "admins insert events" on public.events
  for insert with check (public.is_admin());
create policy "admins update events" on public.events
  for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete events" on public.events
  for delete using (public.is_admin());

create policy "admins insert billboards" on public.billboards
  for insert with check (public.is_admin());
create policy "admins update billboards" on public.billboards
  for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete billboards" on public.billboards
  for delete using (public.is_admin());

-- Re-assert public read, in case the loop above ever runs against a
-- database where one of these was defined as a FOR ALL policy.
drop policy if exists "cafes are publicly readable" on public.cafes;
create policy "cafes are publicly readable" on public.cafes for select using (true);

drop policy if exists "events are publicly readable" on public.events;
create policy "events are publicly readable" on public.events for select using (true);

drop policy if exists "billboards are publicly readable" on public.billboards;
create policy "billboards are publicly readable" on public.billboards for select using (true);

-- A review is a permanent, location-verified record. Correcting one is a
-- future edit flow with its own rules, not a delete-and-repost loop that
-- pays out again each time.
drop policy if exists "users delete their own reviews" on public.reviews;
