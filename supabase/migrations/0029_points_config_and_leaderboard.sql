-- Configurable point rewards (admin-editable via app/api/admin/points-config)
-- for the three ways a visitor currently earns points: posting a review,
-- visiting a cafe, and attaching a photo to a review. Previously only
-- 'review' was awarded, hardcoded client-side in lib/usePoints.ts and
-- inserted directly by the browser — see the RLS policy dropped below for
-- why that was also a quiet self-serve points exploit.
create table if not exists public.points_config (
  action text primary key check (action in ('review', 'visit', 'photo')),
  amount integer not null,
  min_amount integer not null default 1,
  updated_at timestamptz not null default now()
);

insert into public.points_config (action, amount, min_amount) values
  ('review', 10, 5),
  ('visit', 2, 1),
  ('photo', 5, 1)
on conflict (action) do nothing;

alter table public.points_config enable row level security;
-- Deliberately no RLS policies — public reads go through
-- app/api/points-config (service role, values aren't sensitive so this
-- route needs no auth), admin edits through app/api/admin/points-config
-- (service role + requireAdmin). Same reasoning as welcome_bonus_config.

alter table public.points_ledger add column if not exists cafe_id uuid references public.cafes(id) on delete set null;

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.points_ledger'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%reason%'
  loop
    execute format('alter table public.points_ledger drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.points_ledger add constraint points_ledger_reason_check
  check (reason in ('review', 'bonus', 'welcome_bonus', 'visit', 'photo'));

-- Closes a real gap: this policy let any signed-in user insert an
-- arbitrary {amount, reason} row into their own points_ledger directly
-- via the Supabase client — RLS only checked *ownership* (auth.uid() =
-- user_id), never the value, so a user could award themselves any number
-- of points at will. Every award now happens either through a
-- security-definer trigger (below) tied to a real, already-verified
-- server action, or through an admin route using the service role — both
-- bypass RLS entirely, so no insert policy is needed for anyone else.
drop policy if exists "users insert their own points_ledger" on public.points_ledger;

create or replace function public.award_review_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  review_amount integer;
  photo_amount integer;
begin
  select amount into review_amount from public.points_config where action = 'review';
  if review_amount is not null and review_amount > 0 then
    insert into public.points_ledger (user_id, cafe_id, amount, reason, review_id)
    values (new.user_id, new.cafe_id, review_amount, 'review', new.id);
  end if;

  if new.photo_url is not null then
    select amount into photo_amount from public.points_config where action = 'photo';
    if photo_amount is not null and photo_amount > 0 then
      insert into public.points_ledger (user_id, cafe_id, amount, reason, review_id)
      values (new.user_id, new.cafe_id, photo_amount, 'photo', new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_review_created on public.reviews;
create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.award_review_points();

-- Awarded once per (user, cafe) ever, not once per insert — a user could
-- otherwise toggle "Not yet" then "Visited" again on the same cafe
-- (visited_cafes' PK only prevents duplicate *rows*, not re-inserertion
-- after a delete) to farm points indefinitely. The `not exists` guard
-- checks points_ledger itself, which nothing ever deletes from, rather
-- than visited_cafes, which the user can freely clear.
create or replace function public.award_visit_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_amount integer;
begin
  if exists (
    select 1 from public.points_ledger
    where user_id = new.user_id and cafe_id = new.cafe_id and reason = 'visit'
  ) then
    return new;
  end if;

  select amount into visit_amount from public.points_config where action = 'visit';
  if visit_amount is not null and visit_amount > 0 then
    insert into public.points_ledger (user_id, cafe_id, amount, reason)
    values (new.user_id, new.cafe_id, visit_amount, 'visit');
  end if;

  return new;
end;
$$;

drop trigger if exists on_visited_cafe_created on public.visited_cafes;
create trigger on_visited_cafe_created
  after insert on public.visited_cafes
  for each row execute function public.award_visit_points();
