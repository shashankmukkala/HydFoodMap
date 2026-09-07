# HydCafeMap

HydCafeMap is a map-first Hyderabad cafe discovery and advertising platform. It combines a curated directory of cafes, restaurants, and breweries with verified reviews, live cafe events, and premium advertising formats rendered directly on an interactive map.

The product is designed around one idea: help people decide where to go in Hyderabad while giving local cafes and brands memorable ways to be seen.

## Product Vision

HydCafeMap should become a living city guide for Hyderabad:

- Discover cafes, restaurants, breweries, and their neighbourhoods.
- Browse real map locations using cafe logos and compact place cards.
- Learn what each place is famous for.
- Read reviews that are tied to a location-verified visit.
- Follow cafe openings, offers, pop-ups, and city updates.
- Give local brands premium placements on the map.

The visual direction is a premium Hyderabad night-explorer interface: deep ink surfaces, sea-glass panels, electric mint trust accents, coral live signals, and saffron/orange advertising accents.

## Current Status

Implemented:

- 85 curated Hyderabad places loaded from Supabase/local fallback data.
- Cafe markers with logo images or initials fallback.
- Search by cafe name, category, area, and tags.
- Category, tag, and verified-rating filters.
- Full-screen public map shell.
- Telangana map viewport restriction.
- Responsive mobile navigation drawer.
- Glass UI system and premium dark visual theme.
- Cafe detail cards with address, tags, famous-for notes, hours, website/social link, directions, save, share, collections, visited state, and reviews.
- Live news ticker and events drawer.
- Admin event creation and deletion.
- Standard 3D map billboards.
- Moving aircraft banner advertisements.
- Centre-map five-slot sponsored rail advertisements.
- Public `/advertise` campaign enquiry page.
- Admin advertising enquiry inbox.
- Manual enquiry approval and rejection.
- Location-verified review check-in flow.
- Responsive map controls for zoom, rotation, tilt, and reset north.
- Mobile-friendly forms, drawers, safe-area spacing, and horizontal ad slots.

- Admin role table (`admins`) with an `is_admin()` check used by database policies.
- Admin-only read and status updates on advertising enquiries.

Still MVP or pending:

- Admin route authentication and role protection. The `admins` table and
  `is_admin()` now exist and gate the enquiry API, but the `/admin` page
  itself is still reachable by anyone.
- Cafe photos. Only 5 of 85 places have an `image_url`, so most markers and
  detail cards fall back to initials.
- Cafe `hours_text`, `cost_for_two`, and most `image_url` values are empty
  in the live data, so those detail rows and any "open now" filter cannot
  render yet.
- Automatic conversion of approved enquiries into live ads.
- Real UPI QR code and UPI ID configuration.
- Payment gateway or automated payment reconciliation.
- File upload storage for banners and payment proof.
- Supabase syncing for user favourites, visited places, collections, and points.
- Exact polygon-level Telangana boundary enforcement. The current map camera uses a close rectangular state extent.
- Public advertiser analytics such as impressions and clicks.

## Main User Experiences

### Public Map

The public homepage is a full-screen map experience.

- `app/page.tsx` renders `MapExperience` in public mode.
- The map fills the viewport behind all interface layers.
- The header contains search, category selection, filters, 2D/3D view, weather/AQI, and sign-in.
- The menu button opens favourites, visited places, collections, and exploration tools on demand.
- The News pill opens the Hyderabad events drawer.
- The centred ad rail shows five advertising slots.
- Selecting a cafe opens a floating place detail card.
- Selecting a rail ad opens its sponsored detail without moving the map to fake coordinates.

### Cafe Discovery

Cafe records support:

- Name.
- Category.
- Area/location.
- Full address.
- Latitude and longitude.
- Google Maps link.
- Website or Instagram URL.
- Approximate cost for two.
- Tags such as work-friendly, pet-friendly, outdoor seating, or late night.
- Hours text.
- Famous-for note.
- Optional image URL.

The map uses cafe logo markers where an image is available and an initials fallback otherwise. Marker selection highlights the pin and opens the detail card.

### Search and Filters

Search supports direct cafe selection and group matching. Group matching can identify:

- Cafe categories.
- Tags and vibes.
- Areas and neighbourhoods.

Filters currently include category, tags, and minimum verified review rating. The displayed cafe list and map markers are kept in sync.

### Reviews and Trust

The review system is intentionally different from a simple open rating form:

1. A signed-in user starts a cafe check-in.
2. The server creates a short-lived check-in record.
3. The user must remain in the cafe area for the required dwell period.
4. The browser submits location and accuracy information to verify the check-in.
5. The review API accepts the review only when the check-in is valid.
6. A database uniqueness rule prevents more than one review per user per cafe.

Review safeguards include:

- Phone OTP identity through Supabase Auth.
- Server-side check-in verification.
- Distance validation against cafe coordinates.
- GPS accuracy validation.
- Check-in expiry.
- One-review-per-user-per-cafe enforcement.
- Text, rating, and photo validation.
- Verified visit labeling in the interface.

The displayed public cafe rating is intended to come from the verified `reviews` table, not the imported source rating. The imported rating remains internal seed data and must not be presented as a verified user rating.

### Events and News

Events are admin-curated and not tied to map coordinates. They can represent:

- Cafe openings.
- Happy hours.
- Pop-ups.
- Menu launches.
- Workshops.
- Local food and cafe news.

The interface has two layers:

- `LiveTicker`: a compact city broadcast ticker for upcoming events.
- `EventsPanel`: an expandable glass drawer opened from the public News pill.

### User Personal Features

The public UI includes:

- Favourites.
- Visited places.
- Collections.
- Cafes visited count.
- Points display.

At the current MVP stage, these are stored in browser `localStorage`:

- `hydcafemap:bookmarked-cafe-ids`
- `hydcafemap:visited-cafe-ids`
- `hydcafemap:collections`
- `hydcafemap:points`

They are browser-specific and do not yet sync across devices. Migration `0008_users_bookmarks_collections_points.sql` prepares Supabase tables for a future authenticated sync, but the current hooks have not been migrated to use them.

Points should move to a server-side ledger before real rewards or redemptions are launched because browser storage can be manipulated.

## Advertising Platform

HydCafeMap supports three advertising products.

### Five-Slot Map Rail

- Five small slots are displayed in the centre-bottom of the public map.
- The rail can be collapsed into a separate `AD Sponsored` pill.
- Empty slots link to `/advertise`.
- Filled slots open a sponsored detail card.
- Rail ads do not require a map pin.
- Admin publishing uses `Place rail ad`.
- Slots are explicitly assigned from 1 to 5.
- Only one live rail ad can occupy each slot.
- Current price shown on `/advertise`: INR 1,000 for all five slots.

### 3D Map Billboard

- Admin places a billboard at a map location.
- Billboard dimensions and heading can be configured.
- The billboard appears in the map's 3D layer.
- The billboard can be selected through a map marker.
- Current price shown on `/advertise`: INR 3,000 per campaign.

### Aircraft Banner

- Admin launches an aircraft banner directly from the sidebar.
- It does not require a map pin.
- The aircraft travels across the upper map area from left to right or right to left.
- The banner is clickable and opens sponsored information.
- Current price shown on `/advertise`: INR 3,000 per campaign.

### Advertiser Enquiry Flow

The intended workflow is manual during the early stage:

1. An advertiser opens `/advertise`.
2. They choose rail, billboard, or aircraft.
3. The page shows the selected format and price.
4. They provide brand, contact, creative, destination, dates, and notes.
5. They provide payment proof when available.
6. The enquiry is stored with `pending` status.
7. Admin reviews the enquiry in `Ad enquiries`.
8. Admin approves or rejects it.
9. Admin manually publishes the approved ad using the appropriate placement form.

Automatic publishing is intentionally not used yet. Manual publishing lets the owner verify payment, creative quality, campaign dates, destination links, and placement before the ad becomes public.

The QR code and UPI ID in the advertising page are placeholders and must be replaced before accepting real payments.

## Admin Experience

The admin experience is available at:

```text
/admin
```

Admin-only tools include:

- Explore map.
- Billboards list and deletion.
- Ad enquiries inbox.
- Cafe pinning.
- Standard billboard placement.
- Aircraft banner placement.
- Five-slot rail ad placement.
- Event creation and deletion.

The admin sidebar intentionally does not show personal user features such as favourites, visited places, collections, cafes visited, or points.

`/admin` requires signing in with an ID and password (no phone/OTP/SMS involved — see "Admin setup" below) and membership in the `admins` table, checked via the `is_admin()` Postgres function. A signed-in account that isn't in `admins` sees a plain "not an admin" message with no access to any admin tool. The current database policies still contain MVP-open write behavior for some legacy tables outside the admin surface, though — see the known gaps list.

## Project Structure

```text
app/
  page.tsx                         Public map entry point
  admin/page.tsx                   Admin map entry point
  advertise/page.tsx              Public advertising campaign page
  globals.css                      Global theme, responsive layout, map UI
  api/
    cafes/                         Cafe listing, details, ratings, reviews
    events/                        Event listing and admin CRUD
    billboards/                    Billboard, aircraft, and rail ad CRUD
    ad-enquiries/                  Advertiser enquiry create/list/status
    geocode/                       Address search proxy

components/
  MapExperience.tsx                Main application orchestration
  Map.tsx                          MapLibre map and map camera controls
  TopBar.tsx                       Search, filters, view and account controls
  Sidebar.tsx                      Public drawer and admin operations menu
  CafeMarkers.tsx                  Cafe logo/initial markers
  DetailCard.tsx                   Cafe and sponsored placement card
  ReviewsSection.tsx               Verified review/check-in UI
  EventsPanel.tsx                  Events drawer
  LiveTicker.tsx                   Live event ticker
  AdRail.tsx                       Five-slot public ad rail
  PlaceRailAdForm.tsx              Admin rail ad publisher
  PlaceBillboardForm.tsx           Admin billboard/aircraft publisher
  AircraftAdOverlay.tsx            Moving aircraft ads
  BillboardLayer.tsx               3D billboard renderer
  AdEnquiriesPanel.tsx             Admin advertising inbox

lib/
  supabase.ts                       Supabase client and shared types
  mapStyle.ts                       Map style, camera, and Telangana bounds
  useBookmarks.ts                   Current local favourites store
  useVisitTracking.ts               Current local visited store
  useCollections.ts                 Current local collections store
  usePoints.ts                      Current local points store
  AuthGate.tsx                      Sign-in/auth gate behavior
  adminAuth.ts                      Server-side admin check for API routes
  geo.ts                            Distance and geographic helpers

supabase/migrations/
  0001 through 0022                Database schema history
```

## Routes

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Public Hyderabad cafe map |
| `/admin` | Admin map and management workspace |
| `/advertise` | Public advertising enquiry page |

### API Routes

| Route | Purpose |
| --- | --- |
| `GET /api/cafes` | List cafes |
| `GET /api/cafes/[id]` | Fetch one cafe |
| `GET /api/cafes/ratings` | Fetch aggregate verified ratings |
| `POST /api/cafes/[id]/check-in` | Start review check-in |
| `POST /api/cafes/[id]/check-in/verify` | Verify review check-in |
| `GET/POST /api/cafes/[id]/reviews` | Read/create reviews |
| `GET/POST /api/events` | List/create events |
| `DELETE /api/events/[id]` | Delete an event |
| `GET/POST /api/billboards` | List/create billboard formats |
| `DELETE /api/billboards/[id]` | Delete an ad |
| `POST /api/ad-enquiries` | Submit advertiser enquiry (public) |
| `GET /api/ad-enquiries` | Admin enquiry listing. Requires an admin bearer token |
| `PATCH /api/ad-enquiries/[id]` | Approve or reject enquiry. Requires an admin bearer token |
| `GET /api/geocode` | Geocode search proxy |

## Database Migrations

Run migrations in filename order in the Supabase SQL Editor.

Important recent migrations:

- `0001_init.sql`: cafes and billboards.
- `0003_events.sql`: events.
- `0005_reviews.sql` through `0007_review_photo.sql`: review data.
- `0008_users_bookmarks_collections_points.sql`: future authenticated personal data tables.
- `0009_reviews_identity.sql`: review identity changes.
- `0010_cafes_maps_url.sql`: source Maps links.
- `0011_cafe_rating_decimal.sql`: rating precision.
- `0012_cafe_address_contact.sql`: cafe address/contact fields.
- `0013_billboard_target_url.sql`: click destination URL.
- `0014_review_checkins.sql`: location-verified review check-ins.
- `0015_billboard_ad_type.sql`: creates `ad_type`, initially `billboard` only.
- `0016_remove_balloon_ad_type.sql`: intentional no-op, kept so numbering stays continuous.
- `0017_aircraft_banner_ad_type.sql`: widens `ad_type` to include `aircraft`.
- `0018_ad_enquiries.sql`: advertiser enquiry table.
- `0019_ad_enquiry_format.sql`: enquiry format selection.
- `0020_ad_enquiry_payment_proof.sql`: payment proof URL.
- `0021_rail_ads.sql`: rail ad type, slot number, slot validation, and unique slot protection.
- `0022_admin_role_and_enquiry_access.sql`: `admins` table, `is_admin()`, and admin-only enquiry read/update.
- `0023` through `0035`: admin recovery, profiles, server-side visited places and points, notifications, welcome/bulk bonuses, points config and leaderboard, search logs, verified repeat visits, campaign end dates, and preset avatars.
- `0036_normalize_cafe_categories.sql`: maps every cafe onto the four values in `lib/categories.ts` and adds a CHECK constraint so the column and that list cannot drift apart again.

For a fresh project, run all migrations from `0001` through `0036`. For the current rail publisher, `0021_rail_ads.sql` is required.

### Cafe categories

`lib/categories.ts` is the single source of truth for the Type filter, the
pin form, and the admin correction form. The four values are `Cafe`,
`Specialty Coffee`, `Dessert & Bakery`, and `Bistro & Kitchen`.

They were derived from the categories actually present on the 85 curated
places. The previous taxonomy described the older 140-entry dataset, which
contained buffets and lounge bars; against the current data it matched 1 of
85 rows, so every Type chip filtered to an empty map. `0036` remaps the
column and constrains it, so an import carrying an unrecognised category now
fails loudly instead of silently emptying a filter.

Alcohol, rooftop, lakeside, pet-friendly, and vegetarian are deliberately
tags rather than categories: a place can be several at once, which a
single-value category cannot express.

### Notes on the ad_type history

`0015` and `0016` previously added an experimental format and then dropped
the `ad_type` column outright, while `0017` was left empty. That combination
made a clean `0001` onward replay fail at `0021`, because `0021` adds a
constraint referencing a column that no longer existed. The discontinued
format has been removed from the history: `0015` now creates the column,
`0016` is a no-op placeholder, and `0017` widens the allowed values. Every
statement is guarded with `if exists` / `if not exists`, so re-running the
sequence against an existing database is safe.

### Admin setup

`/admin` signs in with an ID and password (`lib/useAuth`'s
`signInWithPassword` — the ID is stored as `email` in `auth.users`, but is
just a unique identifier, never a real, deliverable inbox) — deliberately
not phone/OTP, so it works even before an SMS provider is configured, and
an admin's own login isn't at the mercy of SMS delivery. The account is
created out-of-band with a script, not by signing up through the app:

1. Run `0022_admin_role_and_enquiry_access.sql` (creates the `admins`
   table and `is_admin()`).
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Dashboard > Settings >
   API > service_role) — more sensitive than the anon key, so it isn't in
   `.env.local.example`; never put it in `NEXT_PUBLIC_*` or commit it.
3. Create the admin account and grant it access in one step:

```sh
node --env-file=.env.local scripts/create-admin.mjs owner@hydcafemap.admin "some-strong-password" "owner"
```

This creates the Supabase Auth user with that ID+password (or updates the
password if the ID is already registered) and inserts it into
`public.admins`. Sign in at `/admin` with the same ID and password
afterward.

There is deliberately no insert policy on `admins`, so membership can only
be changed with the service role — the script above, or the SQL editor /
dashboard directly:

```sql
insert into public.admins (user_id, note)
select id, 'owner' from auth.users
where email = 'owner@hydcafemap.admin'
on conflict (user_id) do nothing;
```

Confirm membership with:

```sql
select u.email, a.note
from public.admins a
join auth.users u on u.id = a.user_id;
```

## Local Setup

### Requirements

- Node.js 20 or newer recommended.
- npm.
- A Supabase project for live data.
- A browser with WebGL support for 3D map rendering.

### Environment

Create `.env.local` in the project root with:

```text
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not commit `.env.local` or expose service-role keys in browser code.

### Install and run

```bash
npm install
npm run dev
```

The default Next.js port is 3000. If it is already in use, Next.js may choose another port, such as 3001.

For testing from a phone on the same Wi-Fi network:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Then open the computer's local IPv4 address on the phone:

```text
http://YOUR_COMPUTER_IP:3001
```

For admin:

```text
http://YOUR_COMPUTER_IP:3001/admin
```

## Verification Commands

Run these before considering a change complete:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The current project has been repeatedly validated with lint and TypeScript checks. Physical testing on a range of mobile devices is still required before production launch.

## Design System

The UI uses a dark map-first system rather than a traditional dashboard.

Core colors:

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#0B0D0E` | Page/map foundation |
| Sea glass | `#19302C` | Glass navigation surfaces |
| Electric mint | `#79E2B2` | Trust, navigation, selected states |
| Soft mint | `#B9FFE3` | Primary light accent |
| Coral | `#FF6B6B` | Live signals and badges |
| Saffron | `#FF9F1C` | Advertising and primary commercial actions |

Design rules:

- Keep the map visible and dominant.
- Use drawers and floating panels instead of permanent public columns.
- Keep map controls separate from ad controls.
- Use mint for product trust and coral/orange for commercial urgency.
- Use mobile bottom sheets or horizontal scrollers instead of cramped desktop panels.
- Keep interactive controls at least 44px on touch devices.
- Avoid showing imported ratings as if they were verified reviews.

## Telangana Map Restriction

The map camera is configured in `lib/mapStyle.ts` with:

- `TELANGANA_BOUNDS`.
- `TELANGANA_MIN_ZOOM`.
- `TELANGANA_MAX_ZOOM`.
- `renderWorldCopies: false`.

The MapLibre rectangle prevents normal panning and zooming outside the close Telangana extent. It is not a true administrative polygon boundary; a future version can use a Telangana GeoJSON boundary and stricter camera-center validation if exact state borders are required.

## Data and Content Notes

- The curated cafe list contains 85 verified Hyderabad places.
- Coordinates were corrected manually for the supplied cafes.
- `Pastel Patisserie And Bistro` was removed after being reported permanently closed.
- Cafe source links and Maps links are retained for user actions and verification.
- Imported source ratings are internal only; verified user ratings come from reviews.
- Rail ad records use `ad_type = 'rail'` and a `slot_number` from 1 to 5.
- Rail ads use placeholder database coordinates because they are screen-level placements. The UI intentionally never displays those coordinates or uses them for map navigation.

## Recommended Next Work

Before production:

1. Protect `/admin` with Supabase Auth and an explicit admin role. The
   `admins` table and `is_admin()` from `0022` are the intended basis; the
   page and its remaining write routes still need to use them.
2. Replace open MVP write policies with least-privilege RLS policies.
   `cafes`, `events`, and `billboards` still carry the `using (true)` insert,
   update, and delete policies from `0001` and `0003`, so the public anon key
   can write to them directly. `reviews`, `review_checkins`, `bookmarks`,
   `collections`, `points_ledger`, and `ad_enquiries` are already scoped.
3. Replace the placeholder QR and UPI ID on `/advertise`.
4. Add Supabase Storage for banner images and payment proof.
5. Add an admin preview and activation window for approved ads.
6. Add impression and click tracking for every advertising format.
7. Add automated expiry for campaigns.
8. Connect personal user features to Supabase after account usage grows.
9. Test on real iOS and Android browsers at multiple viewport sizes.
10. Add an exact Telangana polygon boundary if the rectangular extent is not sufficient.

## Important Safety Notes

- Never deploy the current `/admin` route as a public production admin surface without authentication.
- Never trust a browser-provided points total for rewards.
- Never treat an advertiser enquiry as approved payment without manual verification.
- Validate destination URLs and creative content before publishing.
- Keep Supabase service-role credentials server-only.
