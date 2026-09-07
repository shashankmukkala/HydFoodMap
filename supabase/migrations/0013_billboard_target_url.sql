-- Destination for a sponsored billboard click-through.
alter table billboards add column if not exists target_url text;
