-- Google's own Maps URL for the cafe (from new_data.json's `url` field —
-- either a direct place link or a search query), used for the "Directions"
-- button instead of building a link from our own geocoded lat/lng. Our
-- coordinates are good enough to place a pin on the map, but for exact
-- turn-by-turn directions Google's own link to the business (or its own
-- search resolution) is more reliable than re-deriving directions from a
-- geocoded point that may only be road-level accurate, not building-level
-- (see the Churrolto Film Nagar case — its address had no plot number, so
-- Nominatim could only resolve it to a nearby road).
alter table cafes add column if not exists maps_url text;
