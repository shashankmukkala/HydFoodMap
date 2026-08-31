-- Split out of the old catch-all "note" field so the detail card can show
-- them as their own real fields instead of parsing a combined string.
alter table cafes add column if not exists location text;
alter table cafes add column if not exists cost_for_two text;
