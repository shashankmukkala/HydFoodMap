-- New signups now get a random preset "face" avatar (emoji + gradient,
-- see lib/avatars.ts) instead of Google's real profile photo — a user
-- can still pick a different one anytime from /profile. Stored as
-- avatar:<key> in the same profiles.avatar_url text column (no new
-- column), same scheme components/Avatar.tsx already understands.
--
-- The key list here must stay in sync with lib/avatars.ts's
-- AVATAR_OPTIONS — this is server-side Postgres, so it can't import that
-- file directly. Existing users' avatar_url (Google photo or otherwise)
-- is left untouched; this only changes what a *new* signup gets.
-- Reproduces 0028's welcome-bonus logic in full (not just the avatar
-- change) since `create or replace function` replaces the entire body —
-- omitting it here would silently disable the welcome bonus.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  avatar_keys text[] := array[
    'fox', 'cat', 'panda', 'koala', 'lion', 'tiger', 'rabbit', 'frog',
    'monkey', 'unicorn', 'penguin', 'owl', 'dragon', 'octopus', 'bear', 'wolf'
  ];
  chosen_avatar text;
  cfg record;
begin
  chosen_avatar := 'avatar:' || avatar_keys[1 + floor(random() * array_length(avatar_keys, 1))::int];

  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    chosen_avatar
  )
  on conflict (user_id) do nothing;

  select * into cfg from public.welcome_bonus_config where id = 1;
  if cfg.enabled and cfg.amount > 0
     and (cfg.starts_at is null or new.created_at >= cfg.starts_at)
     and (cfg.ends_at is null or new.created_at <= cfg.ends_at)
  then
    insert into public.points_ledger (user_id, amount, reason)
    values (new.id, cfg.amount, 'welcome_bonus');

    insert into public.notifications (user_id, message, type, amount)
    values (
      new.id,
      coalesce(cfg.message, 'Welcome to HydCafeMap!'),
      'welcome_bonus',
      cfg.amount
    );
  end if;

  return new;
end;
$$;
