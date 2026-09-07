-- User-facing notifications, first used for admin bonus-point awards
-- (app/api/admin/users/[userId]/bonus-points) so the recipient actually
-- sees *why* their balance changed, not just a silently larger number.
-- Deliberately no insert policy for regular users — every row here is
-- written by the server (service role, e.g. the bonus-points route),
-- same reasoning as admin_recovery/ad_enquiries: this is a channel FROM
-- the app/admin TO a user, not something a user should be able to fake
-- into existence for themselves.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);

alter table public.notifications enable row level security;

drop policy if exists "users read their own notifications" on public.notifications;
create policy "users read their own notifications" on public.notifications
  for select using (auth.uid() = user_id);

-- Only field a user can change is read_at, marking a notification seen —
-- there's no column-level RLS, but the client only ever sends {read_at},
-- and there's nothing meaningful to gain by also being able to rewrite
-- one's own message/created_at.
drop policy if exists "users mark their own notifications read" on public.notifications;
create policy "users mark their own notifications read" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
