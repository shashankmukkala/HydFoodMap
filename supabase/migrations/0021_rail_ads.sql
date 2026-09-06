alter table public.billboards
  add column if not exists slot_number integer;

alter table public.billboards
  drop constraint if exists billboards_ad_type_check;

alter table public.billboards
  add constraint billboards_ad_type_check check (ad_type in ('billboard', 'aircraft', 'rail'));

alter table public.billboards
  drop constraint if exists billboards_rail_slot_check;

alter table public.billboards
  add constraint billboards_rail_slot_check check (ad_type <> 'rail' or slot_number between 1 and 5);

create unique index if not exists billboards_rail_slot_unique
  on public.billboards (slot_number)
  where ad_type = 'rail';
