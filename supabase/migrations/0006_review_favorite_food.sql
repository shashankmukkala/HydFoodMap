-- What the reviewer liked most, e.g. "Filter coffee" or "Nutella croissant".
alter table reviews add column if not exists favorite_food text;
