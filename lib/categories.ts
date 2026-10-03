// Fixed cafe-type taxonomy — what kind of place it is, as opposed to
// lib/tags.ts which is about vibe/amenities. Used by the pin form's
// category select (PlaceCafeForm), the admin correction form
// (EditCafeTaxonomy), and the top bar's "Type" filter, so all three stay
// in sync.
//
// Derived from the categories actually present on the 85 curated places,
// the same way lib/tags.ts was regenerated from the real tag values. The
// previous taxonomy ("Classic Cafe & Specialty Coffee Shop", "Gourmet
// Buffet & Live Grill", ...) described the older 140-entry dataset, which
// genuinely contained buffets and lounge bars; against the current data it
// matched 1 of 85 cafes, so every Type chip filtered to an empty map.
//
// The split is by what a place is primarily *for*, since that is the
// question the filter answers ("where do I want to go"):
//   - Cafe               general cafes, the honest default
//   - Specialty Coffee   coffee-led roasteries and brew bars
//   - Dessert & Bakery   patisseries, bakehouses, chocolatiers, creameries
//   - Bistro & Kitchen   cafes you go to for a full meal
//
// Deliberately NOT split on alcohol, rooftop, lakeside, pet-friendly or
// vegetarian: each of those is already a tag, and a place can be several
// of them at once, which is exactly what a tag models and a single-value
// category cannot. "Cafe" ends up the largest bucket (~40 of 85) because
// the source data describes those places as nothing more specific than
// "Cafe" — an honest large bucket beats inventing distinctions the data
// does not support.
//
// No catch-all "Other": the "no filter" state is activeCategory === null
// (shown as "All"), not a value in this list. Migration
// 0036_normalize_cafe_categories.sql maps every existing row onto these
// four and adds a CHECK constraint, so the column and this list cannot
// drift apart again.
export const CATEGORY_OPTIONS = [
  "Cafe",
  "Specialty Coffee",
  "Dessert & Bakery",
  "Bistro & Kitchen",
] as const;

export type Category = (typeof CATEGORY_OPTIONS)[number];

/**
 * Coerces any category string onto the current four, using the same
 * cascade — and the same order — that
 * 0036_normalize_cafe_categories.sql applies in Postgres.
 *
 * Every row in the real database already satisfies this: 0036 rewrote them
 * and added a CHECK constraint. It exists for data that has NOT been
 * through the migration, which in practice means the dev seed file, whose
 * 140 rows still carry the pre-0036 taxonomy ("Classic Cafe & Specialty
 * Coffee Shop", "Gourmet Buffet & Live Grill", ...).
 *
 * Leaving those unnormalised broke local development in a way that looked
 * like broken code rather than stale data: every Type chip filtered to an
 * empty map, searching "cafe" or "dessert" returned nothing (the group
 * matcher reports a category and the caller filters on equality), and
 * every map dot fell through to unclassified grey.
 *
 * Deliberately a copy of the SQL rather than a second taxonomy: if the two
 * disagree, a cafe is filed under one category in Postgres and shown under
 * another in the interface.
 */
export function normalizeCategory(raw: string | null | undefined): Category | null {
  if (!raw || !raw.trim()) return null;
  if ((CATEGORY_OPTIONS as readonly string[]).includes(raw)) return raw as Category;

  if (/(patisserie|bakery|bakehouse|bakes|dessert|chocolat|ice cream|creamery)/i.test(raw)) {
    return "Dessert & Bakery";
  }
  if (
    /(bistro|restaurant|continental|italian|multi-cuisine|kitchen|pizzeria|pizzateria|thai|asian|fast food|cafe bar)/i.test(
      raw
    )
  ) {
    return "Bistro & Kitchen";
  }
  if (/(specialty coffee|latte art|vietnamese coffee)/i.test(raw)) {
    return "Specialty Coffee";
  }
  // The migration's own fallthrough: anything naming no stronger signal is
  // a cafe, which is the honest answer rather than "unknown".
  return "Cafe";
}

export const CATEGORY_ICONS: Record<Category, string> = {
  Cafe: "☕",
  "Specialty Coffee": "🌟",
  "Dessert & Bakery": "🍰",
  "Bistro & Kitchen": "🍽️",
};

// Short display labels for pills and dropdown chips. These names are
// already short enough to use as-is, unlike the previous taxonomy's
// "Cafe-Style Bistro & Lounge Bar (With Alcohol)" — the indirection is
// kept because TopBar, DetailCard, SearchResultsPanel, CollectionsPanel,
// FeedPanel and searchMatch all read through it, and a two-word chip
// ("Dessert & Bakery") still reads better as one word in a filter row.
// Display-only; filtering and matching always use the full
// CATEGORY_OPTIONS string.
export const CATEGORY_SHORT_LABELS: Record<Category, string> = {
  Cafe: "Cafe",
  "Specialty Coffee": "Coffee",
  "Dessert & Bakery": "Dessert",
  "Bistro & Kitchen": "Bistro",
};

// Aurora-style backdrop: a fixed near-black base with soft blurred color
// blobs (radial gradients, generous falloff so they read as blur without
// needing a filter) that recolor per selected cafe type — amber/coffee for
// cafes, teal for specialty coffee, rose for dessert places, violet for
// bistros — so switching the "Type" filter reads as a mood shift, not just
// a list changing. Each category is deliberately monochromatic (three
// shades of ONE hue, not a mix of different hues) so it reads as a single
// clear color per category rather than looking like two competing colors.
// The four hues are spread around the wheel on purpose: the previous set
// paired rose with deep red, which read as one color at a glance.
// "all" is the default (no filter) state — shows all four category colors
// at once (one blob per corner: amber, teal, rose, violet) instead of
// picking just one, since "All" represents every category together, not a
// category of its own. Each blob is slightly lower alpha than a single
// category's blob (0.38 vs 0.4-0.55) so the combined "All" view doesn't
// out-intensify a filtered one. Deliberately one fixed dark canvas
// regardless of the light/dark theme toggle (see the .panel-elevated
// comment in globals.css for why) — light glass panels need a
// consistently dark backdrop to read as glass at all.
//
// Each value below is written out in full (not composed from a shared
// constant) on purpose: Tailwind's class scanner only picks up arbitrary
// values that appear as one complete literal string in the source — a
// template/concatenated string never renders as real CSS since the final
// class name doesn't exist anywhere in the file for the scanner to find.
export const BACKGROUND_GRADIENTS: Record<Category | "all", string> = {
  all: "bg-[radial-gradient(circle_at_15%_20%,rgba(217,119,6,0.38),transparent_48%),radial-gradient(circle_at_85%_20%,rgba(13,148,136,0.38),transparent_48%),radial-gradient(circle_at_15%_85%,rgba(236,72,153,0.38),transparent_48%),radial-gradient(circle_at_85%_85%,rgba(139,92,246,0.38),transparent_48%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
  Cafe: "bg-[radial-gradient(circle_at_18%_22%,rgba(217,119,6,0.55),transparent_45%),radial-gradient(circle_at_82%_28%,rgba(245,158,11,0.4),transparent_50%),radial-gradient(circle_at_50%_88%,rgba(120,53,15,0.4),transparent_55%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
  "Specialty Coffee":
    "bg-[radial-gradient(circle_at_18%_22%,rgba(13,148,136,0.5),transparent_45%),radial-gradient(circle_at_82%_28%,rgba(45,212,191,0.4),transparent_50%),radial-gradient(circle_at_50%_88%,rgba(19,78,74,0.45),transparent_55%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
  "Dessert & Bakery":
    "bg-[radial-gradient(circle_at_18%_22%,rgba(236,72,153,0.5),transparent_45%),radial-gradient(circle_at_82%_28%,rgba(244,114,182,0.4),transparent_50%),radial-gradient(circle_at_50%_88%,rgba(157,23,77,0.4),transparent_55%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
  "Bistro & Kitchen":
    "bg-[radial-gradient(circle_at_18%_22%,rgba(139,92,246,0.5),transparent_45%),radial-gradient(circle_at_82%_28%,rgba(168,85,247,0.4),transparent_50%),radial-gradient(circle_at_50%_88%,rgba(76,29,149,0.45),transparent_55%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
};
