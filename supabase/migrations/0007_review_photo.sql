-- Optional photo attached to a review, stored as a data URL for now.
alter table reviews add column if not exists photo_url text;
