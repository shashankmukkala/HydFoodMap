-- Supported sponsored map formats. Existing placements remain standard
-- billboards through the default.
alter table billboards add column if not exists ad_type text not null default 'billboard';
alter table billboards drop constraint if exists billboards_ad_type_check;
alter table billboards add constraint billboards_ad_type_check check (ad_type in ('billboard', 'balloon'));
