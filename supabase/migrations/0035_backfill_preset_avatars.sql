-- 0034 only changed what a *new* signup gets — every account created
-- before it still has whatever was in avatar_url before (a real Google
-- photo URL, or null), which is exactly what was showing up as an
-- alphabet-initial fallback in the UI (components/Avatar.tsx no longer
-- has an initial-letter or real-photo path at all — every avatar is one
-- of the 16 presets, always). This backfills every existing profile the
-- same deterministic way: hashtext(user_id) picks one of the 16 preset
-- keys, so it's stable if this ever needs to run again. Only touches
-- rows that don't already have a preset assigned, so a deliberate choice
-- made through the /profile picker (avatar:<key> already) is left alone.
do $$
declare
  avatar_keys text[] := array[
    'fox', 'cat', 'panda', 'koala', 'lion', 'tiger', 'rabbit', 'frog',
    'monkey', 'unicorn', 'penguin', 'owl', 'dragon', 'octopus', 'bear', 'wolf'
  ];
  r record;
  idx int;
begin
  for r in
    select user_id from public.profiles
    where avatar_url is null or avatar_url not like 'avatar:%'
  loop
    idx := 1 + (abs(hashtext(r.user_id::text)) % array_length(avatar_keys, 1));
    update public.profiles
    set avatar_url = 'avatar:' || avatar_keys[idx], updated_at = now()
    where user_id = r.user_id;
  end loop;
end $$;
