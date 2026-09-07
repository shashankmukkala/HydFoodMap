-- Personal details, one row per signed-in user. Seeded automatically from
-- Google's own profile data (name/avatar) the moment a new auth.users row
-- appears, via the trigger below — so a user already has a profiles row
-- by the time they first visit /profile, no client-side "create on first
-- load" bootstrap needed.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "users read their own profile" on public.profiles;
create policy "users read their own profile" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No insert/delete policy for regular users — rows are created only by
-- the trigger (security definer, bypasses RLS) and removed only via the
-- auth.users cascade when an account itself is deleted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
