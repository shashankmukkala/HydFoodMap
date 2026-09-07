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

Accounts and engagement:

- Google sign-in, with a `profiles` row created automatically at signup.
- Preset avatars, chosen at signup and editable on `/profile`.
- Server-side points ledger with admin-configurable rewards.
- Welcome bonus for new accounts, with its own admin settings.
- Public leaderboard, ranked on points, excluding admins and banned users.
- In-app notifications, first used for point awards.
- GPS-verified visits, including a rewarded repeat visit after a cooldown.
- Search logging, aggregated in the admin analytics view.

Admin console:

- Password sign-in gated by the `admins` table and an `is_admin()` check,
  both evaluated in Postgres rather than in client state.
- Self-service password recovery using two pre-set recovery numbers.
- User management: list, ban, award bonus points, bulk award.
- Analytics across cafes, reviews, visits, bookmarks, and searches.
- Points and welcome-bonus configuration.
- Cafe photo, category, and tag correction.

Mobile experience:

- Panels are bottom sheets below 1024px, with one open at a time.
- Cards close by swipe, by tapping the map, by Escape, or by the close
  button; the close controls are 44px on touch devices.
- The ad rail steps aside while a sheet is open instead of being covered.
- The map camera offsets so a selected pin stays visible beside the card
  rather than behind it.

Still MVP or pending:

- Cafe photos. Only 5 of 85 places have an `image_url`, so most markers
  fall back to initials and most cards open without a banner.
- Cafe `hours_text` and `cost_for_two` are empty for all 85 records, so
  those rows never render and an "open now" filter cannot be built yet.
- Photo storage. Review photos and admin-uploaded cafe photos are embedded
  in the row as data URLs. This is fine at five photos and will not be at
  eighty-five: `/api/cafes` returns every cafe with its photo on every page
  load. Move to Supabase Storage before bulk-adding logos.
- Automatic conversion of approved enquiries into live ads.
- Real UPI QR code and UPI ID configuration.
- Payment gateway or automated payment reconciliation.
- File upload storage for banners and payment proof.
- Repeat welcome bonuses are possible by creating additional Google
  accounts. There is no honest code-level fix; keep the bonus small until
  points are redeemable.
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

These are stored per account in Supabase, not in browser storage, so they
follow a user across devices: `bookmarks`, `collections`, `visited_cafes`,
and `points_ledger`.

Points are a ledger of earn events rather than a running total, so a
balance is always the sum of what was actually awarded and cannot drift.
Every award is written either by a security-definer trigger tied to a
verified action or by an admin route using the service role. There is no
insert policy on `points_ledger` for regular users, which is deliberate:
an earlier policy checked only row ownership and not the value, so a
signed-in user could award themselves any amount directly through the
Supabase client.

Visits are equally not self-reported. Marking a cafe visited requires the
same GPS check-in, dwell, and re-verify sequence a review does, and the
row is written server-side by `/api/cafes/[id]/log-visit`. A repeat visit
to the same cafe earns a smaller reward, gated by a 20-hour cooldown so
the same visit cannot be re-logged from the same seat.

Posting a review records the visit too. A verified review is stronger
proof of presence than the visit check-in, so one check-in covers both and
the cafe appears in Visited without a second 30-second wait.

Reviews cannot be deleted. Deleting one used to free the one-review-per-
cafe slot while leaving its points in place, which made a check-in,
review, delete, repeat loop worth the full reward every 40 seconds.
Correcting a review is a future edit flow with its own rules.

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
  AdminGate.tsx                    Admin sign-in and is_admin check
  VisitCheckin.tsx                 GPS-verified visit flow
  NotificationsBell.tsx            In-app notifications
  Avatar.tsx                       Preset avatar rendering
  EditCafeTaxonomy.tsx             Admin photo/category/tag correction

lib/
  supabase.ts                       Supabase client and shared types
  mapStyle.ts                       Map style, camera, and Telangana bounds
  useBookmarks.ts                   Per-account favourites
  useVisitTracking.ts               Per-account visited places, read-only
  useCollections.ts                 Per-account collections
  usePoints.ts                      Points balance
  useProfile.ts                     The signed-in user's profile row
  useNotifications.ts               Notification list and read state
  useLocationCheckin.ts             GPS check-in, dwell, and re-verify
  useMediaQuery.ts                  Viewport-driven behaviour, not styling
  useSwipeToDismiss.ts              Bottom-sheet drag gesture
  AuthGate.tsx                      Sign-in/auth gate behavior
  useAdminAuth.ts                   Admin console session, separate from the public one
  adminAuth.ts                      Server-side admin check for API routes
  adminFetch.ts                     Attaches the admin token to a request
  recordVisit.ts                    Shared verified-visit write
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
| `POST /api/cafes/[id]/log-visit` | Record a GPS-verified visit |
| `POST /api/cafes` | Create a cafe. Requires an admin bearer token |
| `PATCH/DELETE /api/cafes/[id]` | Edit or remove a cafe. Requires an admin bearer token |
| `GET /api/events` | List events |
| `POST /api/events` | Create an event. Requires an admin bearer token |
| `DELETE /api/events/[id]` | Delete an event. Requires an admin bearer token |
| `GET /api/billboards` | List all sponsored placements |
| `POST /api/billboards` | Create a placement. Requires an admin bearer token |
| `PATCH/DELETE /api/billboards/[id]` | Edit or remove an ad. Requires an admin bearer token |
| `GET /api/leaderboard` | Public ranking, plus the caller's own rank |
| `GET /api/points-config` | Current point values |
| `POST /api/search-logs` | Record a search for admin analytics |
| `GET /api/admin/analytics` | Admin dashboard aggregate |
| `GET /api/admin/users` | Admin user list |
| `PATCH /api/admin/users/[userId]/ban` | Ban or unban a user |
| `POST /api/admin/users/[userId]/bonus-points` | Award bonus points |
| `POST /api/admin/users/bulk-bonus-points` | Award bonus points in bulk |
| `GET/PATCH /api/admin/points-config` | Read or edit point values |
| `GET/PATCH /api/admin/welcome-bonus` | Read or edit the signup bonus |
| `POST /api/admin/reset-password` | Admin password recovery |
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
- `0037_lock_legacy_write_policies.sql`: moves `cafes`, `events`, and `billboards` writes behind `is_admin()`, and removes review deletion. See below.
- `0038_leaderboard_stats_function.sql`: single aggregate for the leaderboard.
- `0039_leaderboard_public_names.sql`: shortens names on the public ranking.

For a fresh project, run all migrations from `0001` through `0039`. For the current rail publisher, `0021_rail_ads.sql` is required.

### Row level security

Reads are public where the product is public: the map, the ad rail, the
events ticker, and reviews. Writes are not.

`cafes`, `events`, and `billboards` carried `with check (true)` insert,
update, and delete policies from `0001` and `0003`, written before the
project had any authentication. The anon key ships in every browser that
loads the site, so anyone could add a cafe, delete an event, or publish a
billboard, aircraft banner, or rail slot directly against PostgREST —
bypassing both the admin console and payment. `0037` moves all three
behind `is_admin()`.

The matching API routes were open too, and are now gated with
`requireAdmin`. Both halves are needed: the route check stops the app-level
path, the policy stops the direct-to-database one.

Personal tables (`bookmarks`, `collections`, `visited_cafes`,
`points_ledger`, `notifications`, `profiles`, `review_checkins`) are scoped
to `auth.uid()`. `visit_log`, `points_config`, `welcome_bonus_config`, and
`admin_recovery` have no client policies at all and are reached only
through service-role routes.

To check the current state from outside, attempt an anonymous insert. A
`42501` means the policy refused it. A `23502` or `23514` means the write
reached a column constraint, which means RLS had already let it through.

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

Applying the palette:

Mint marks trust and carries the primary action. Amber and saffron mean
sponsored, and nothing else. The cafe card previously spent amber on tags,
the "known for" note, links, and the saved state, which left the
advertising colour doing product work while mint went unused on the one
surface whose whole selling point is trust. Amber now appears there only
on the sponsored placement block.

Panels and sheets:

Below 1024px, panels are bottom sheets and only one is open at a time —
each wants most of a phone screen. At or above it, the right-hand column is
wide enough for a list and a card to stack, which is useful when picking
through several results. A card must be dismissible by swipe, by tapping
the map, and by Escape, not only by its close button.

`lib/useMediaQuery.ts` exists for behaviour that CSS cannot express, such
as "opening a card should close the list, but only on a phone". Anything
that only changes appearance belongs in a media query.

Performance on mid-range phones:

- Do not leave a MapLibre custom layer calling `triggerRepaint()`
  unconditionally. That pins the map into a permanent render loop; the
  billboard layer did this even with no billboards placed.
- Backdrop blur is reduced under `pointer: coarse`. Each blurred surface
  re-samples everything behind it every frame, and this app stacks panels
  over an animated backdrop over a live WebGL map.
- Gestures write `transform` directly to the node rather than through
  React state, so a drag never re-renders the card it is moving.
- `prefers-reduced-motion` disables the sheet animations.

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

1. Move photos to Supabase Storage before bulk-adding cafe logos. Review
   photos and admin-uploaded cafe photos are embedded in the row as data
   URLs, and `/api/cafes` returns every cafe with its photo on every page
   load. Cheap to change at five photos, a data migration at eighty-five.
2. Fill in `hours_text` and `cost_for_two`. Both are empty for all 85
   records, so those rows never render and "open now" — the most-used
   filter in this category — cannot be built.
3. Add cafe photography. Five of 85 is the largest single gap between how
   the product looks now and how it should look.
4. Replace the placeholder QR and UPI ID on `/advertise`.
5. Add an admin preview and activation window for approved ads.
6. Add impression and click tracking for every advertising format.
7. Add automated expiry for campaigns.
8. Test on real iOS and Android browsers at multiple viewport sizes. The
   mobile sheet work has been verified by build and type check only.
9. Add an exact Telangana polygon boundary if the rectangular extent is not sufficient.
10. Consider a review edit flow. Reviews are currently permanent, since
    deletion was the mechanism behind a points-farming loop.

## Important Safety Notes

- `/admin` is gated by password sign-in plus `admins` membership, checked
  in Postgres. Keep every admin API route behind `requireAdmin` as well —
  a page-level gate only hides the buttons, it does not stop a direct
  request.
- Never trust a browser-provided points total for rewards. Award points
  only from a trigger tied to a verified action or from a service-role
  route, never from a client insert.
- Never treat an advertiser enquiry as approved payment without manual verification.
- Validate destination URLs and creative content before publishing.
- Keep Supabase service-role credentials server-only.
