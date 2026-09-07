-- Normalize cafes.category onto the four values in lib/categories.ts.
--
-- The column is free text and was bulk-imported from the source CSV, so it
-- accumulated 44 distinct spellings across 85 rows ("Cafe / Coffee /
-- Bakery", "Cafe / Latte Art Studio", "Hotel Cafe / Bakery", ...). Only 1
-- of 85 matched the taxonomy the UI filters on, so every Type chip and the
-- category-aware half of search matched an empty set, and the aurora
-- backdrop never changed colour.
--
-- Priority order below is deliberate and mirrors lib/categories.ts:
-- a place described as "Cafe / Bakery / Desserts" is a dessert place that
-- happens to also be a cafe, so dessert must win over the generic "Cafe"
-- token. Food/bistro beats coffee for the same reason. Anything with no
-- stronger signal falls through to 'Cafe', which is the honest answer for
-- the 29 rows the source describes as nothing more than "Cafe".
--
-- Idempotent: re-running maps the already-canonical values onto
-- themselves ('Cafe' has no dessert/bistro/coffee token and falls through
-- to 'Cafe'; 'Dessert & Bakery' matches the dessert branch; 'Bistro &
-- Kitchen' the bistro branch; 'Specialty Coffee' the coffee branch).

update public.cafes
set category = case
  when category is null or btrim(category) = '' then null
  when category ~* '(patisserie|bakery|bakehouse|bakes|dessert|chocolat|ice cream|creamery)' then 'Dessert & Bakery'
  when category ~* '(bistro|restaurant|continental|italian|multi-cuisine|kitchen|pizzeria|pizzateria|thai|asian|fast food|cafe bar)' then 'Bistro & Kitchen'
  when category ~* '(specialty coffee|latte art|vietnamese coffee)' then 'Specialty Coffee'
  else 'Cafe'
end;

-- Keeps the column and lib/categories.ts from drifting apart again — the
-- exact failure this migration exists to repair. NULL stays allowed: the
-- admin form (EditCafeTaxonomy) offers an explicit "No category" option,
-- and a bulk import with an unrecognised value should now fail loudly here
-- rather than silently emptying a filter chip.
alter table public.cafes drop constraint if exists cafes_category_check;
alter table public.cafes add constraint cafes_category_check
  check (category is null or category in ('Cafe', 'Specialty Coffee', 'Dessert & Bakery', 'Bistro & Kitchen'));
