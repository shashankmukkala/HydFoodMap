-- Preserve the full venue address and the primary public contact/profile link.
alter table cafes add column if not exists address text;
alter table cafes add column if not exists website_or_instagram text;
