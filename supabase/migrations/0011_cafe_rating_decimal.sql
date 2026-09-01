-- `rating` was smallint (whole numbers only) from when it meant a
-- self-reported 1-5 star pin rating. It's now repurposed as an internal,
-- non-displayed Google-sourced rating carried over from new_data.json for
-- ranking/ordering (see the field's comment in lib/supabase.ts) — those
-- values are decimals (4.7, 4.6, ...), which smallint rejects outright.
alter table cafes drop constraint if exists cafes_rating_check;
alter table cafes alter column rating type numeric(2, 1) using rating::numeric(2, 1);
alter table cafes add constraint cafes_rating_check check (rating between 1 and 5);
