-- Supported sponsored map formats. Existing placements remain standard
-- billboards through the default. Later migrations widen the allowed set
-- as each new format ships (0017 adds aircraft, 0021 adds rail).
alter table billboards add column if not exists ad_type text not null default 'billboard';
alter table billboards drop constraint if exists billboards_ad_type_check;
alter table billboards add constraint billboards_ad_type_check check (ad_type in ('billboard'));
