-- Remove the experimental balloon format before introducing the aircraft
-- banner format. Existing records are preserved as standard billboards.
update billboards set ad_type = 'billboard' where ad_type = 'balloon';
alter table billboards drop constraint if exists billboards_ad_type_check;
alter table billboards drop column if exists ad_type;
