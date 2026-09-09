-- Owner-supplied corrections, verified before applying.
--
-- Background: an audit of all 85 pins found the coordinates in the
-- database do not come from hyderabad_cafes_enriched_corrected.csv, which
-- is where the addresses come from. The CSV carries 7-decimal geocoder
-- output; the seed file the database was loaded from
-- (scripts/seed-cafes-curated-86.json) carries 13-15 decimal places, which
-- no geocoder produces. Only 16 of 85 pins match the CSV, the rest differ
-- by a median of 1.17km. The addresses are the trustworthy side.
--
-- These four rows were checked individually with the owner rather than
-- bulk-restored from the CSV, because the CSV's own coordinates are often
-- area centroids from the geocoder's fallback and would not be
-- building-accurate either.

-- Pin was in Nehru Nagar, Marredpally — Secunderabad, 11km north of the
-- Jubilee Hills address on its card. Replacement verified by reverse
-- geocoding: resolves to Jubilee Hills, Ward 95.
update public.cafes
set lat = 17.43692525979833, lng = 78.39952348465663
where name = 'Conçu';

-- Pin confirmed correct by the owner; only the address text was
-- incomplete. Adds the housing society, which is how the place is
-- actually found on the ground.
update public.cafes
set address = 'Madhu Vihar, Rd Number 7, Durga Bhavani Nagar, Women''s Welfare Housing Society, Jubilee Hills, Hyderabad, Telangana 500034'
where name = 'Lunar Cafe';

-- Same: pin correct, address text corrected to the door number as
-- written locally.
update public.cafes
set address = '8 2, 287/12, 418, Road No. 14, BNR Colony, Venkat Nagar, Banjara Hills, Hyderabad, Telangana 500034'
where name = 'Roastery Coffee House';
