-- Admin identity, and admin-only access to the advertising enquiry inbox.
--
-- 0018 created ad_enquiries with an INSERT policy only, so nothing could
-- ever read the table back — the admin inbox returned zero rows even when
-- enquiries existed. Enquiries carry contact details and a payment-proof
-- URL, so the fix is an admin-scoped read, never an anon one.

-- Membership is granted out-of-band (service role / SQL editor). There is
-- deliberately no insert/update/delete policy below, so a signed-in user
-- can never add themselves.
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- A user may check whether they themselves are an admin, and nothing else.
-- The full membership list stays private.
drop policy if exists "users read their own admin row" on public.admins;
create policy "users read their own admin row" on public.admins
  for select using (auth.uid() = user_id);

-- security definer so policies on other tables can call this without being
-- filtered by admins' own RLS above (which would otherwise make the check
-- depend on the caller being able to read the row it is testing for).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Submissions stay open to everyone (that is the point of /advertise);
-- reading and acting on them becomes admin-only.
drop policy if exists "admins read ad enquiries" on public.ad_enquiries;
create policy "admins read ad enquiries" on public.ad_enquiries
  for select using (public.is_admin());

drop policy if exists "admins update ad enquiry status" on public.ad_enquiries;
create policy "admins update ad enquiry status" on public.ad_enquiries
  for update using (public.is_admin()) with check (public.is_admin());
