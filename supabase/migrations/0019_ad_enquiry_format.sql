alter table public.ad_enquiries
  add column if not exists ad_format text not null default 'map_rail'
  check (ad_format in ('map_rail', 'billboard', 'aircraft'));
