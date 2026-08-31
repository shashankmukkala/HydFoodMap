-- Extra fields the cafe detail card displays: a photo, quick-filter tags,
-- opening hours, and a self-submitted rating from whoever pins the cafe
-- (not an aggregated review system — there's no review submission flow yet).
alter table cafes add column if not exists image_url text;
alter table cafes add column if not exists tags text[] not null default '{}';
alter table cafes add column if not exists hours_text text;
alter table cafes add column if not exists rating smallint check (rating between 1 and 5);
