-- Add the aircraft-towed banner format. Existing placements remain standard
-- billboards through the default set in 0015.
alter table public.billboards
  add column if not exists ad_type text not null default 'billboard';

alter table public.billboards drop constraint if exists billboards_ad_type_check;
alter table public.billboards
  add constraint billboards_ad_type_check check (ad_type in ('billboard', 'aircraft'));
