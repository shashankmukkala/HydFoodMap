// Fixed cafe-type taxonomy — what kind of cafe it is, as opposed to
// lib/tags.ts which is about vibe/amenities. Used by the pin form's
// category select and the top bar's "Type" filter, so both stay in sync.
// Matches the four real categories in new_data.json (the curated, final
// Hyderabad cafe dataset — replaced the older data.json/geocode-cafes.mjs
// pipeline, see scripts/geocode-new-data.mjs). No catch-all "Other" —
// every real cafe in the dataset fits one of these four, and the "no
// filter" state is represented by activeCategory being null (shown as
// "All"), not a value in this list.
export const CATEGORY_OPTIONS = [
  "Classic Cafe & Specialty Coffee Shop",
  "Premium Dessert Place & Patisserie",
  "Cafe-Style Bistro & Lounge Bar (With Alcohol)",
  "Gourmet Buffet & Live Grill",
] as const;

export type Category = (typeof CATEGORY_OPTIONS)[number];

export const CATEGORY_ICONS: Record<Category, string> = {
  "Classic Cafe & Specialty Coffee Shop": "☕",
  "Premium Dessert Place & Patisserie": "🍰",
  "Cafe-Style Bistro & Lounge Bar (With Alcohol)": "🍸",
  "Gourmet Buffet & Live Grill": "🍽️",
};

// Short display labels — the real category values above are long (they
// match new_data.json's source categories verbatim, so filtering stays
// correct against the real dataset), but a pill or dropdown chip reading
// "Cafe-Style Bistro & Lounge Bar (With Alcohol)" is unreadable. These are
// display-only; filtering/matching always uses the full CATEGORY_OPTIONS
// string.
export const CATEGORY_SHORT_LABELS: Record<Category, string> = {
  "Classic Cafe & Specialty Coffee Shop": "Cafe",
  "Premium Dessert Place & Patisserie": "Dessert",
  "Cafe-Style Bistro & Lounge Bar (With Alcohol)": "Bar",
  "Gourmet Buffet & Live Grill": "Buffet",
};

// Aurora-style backdrop: a fixed near-black base with soft blurred color
// blobs (radial gradients, generous falloff so they read as blur without
// needing a filter) that recolor per selected cafe type — amber/coffee
// for cafes, rose for dessert places, violet for bars, deep red for
// buffet & grill — so switching the "Type" filter reads as a mood shift,
// not just a list changing. Each category is deliberately monochromatic
// (three shades of ONE hue, not a mix of different hues) so it reads as a
// single clear color per category rather than looking like two competing
// colors. "all" is the default (no filter) state — shows all four
// category colors at once (one blob per corner: amber, rose, violet, red)
// instead of picking just one, since "All" represents every category
// together, not a category of its own. Each blob is slightly lower alpha
// than a single category's blob (0.38 vs 0.4-0.55) so the combined "All"
// view doesn't out-intensify a filtered one. Deliberately one fixed dark
// canvas regardless of the light/dark theme toggle (see the
// .panel-elevated comment in globals.css for why) — light glass panels
// need a consistently dark backdrop to read as glass at all.
//
// Each value below is written out in full (not composed from a shared
// constant) on purpose: Tailwind's class scanner only picks up arbitrary
// values that appear as one complete literal string in the source — a
// template/concatenated string never renders as real CSS since the final
// class name doesn't exist anywhere in the file for the scanner to find.
export const BACKGROUND_GRADIENTS: Record<Category | "all", string> = {
  all: "bg-[radial-gradient(circle_at_15%_20%,rgba(217,119,6,0.38),transparent_48%),radial-gradient(circle_at_85%_20%,rgba(236,72,153,0.38),transparent_48%),radial-gradient(circle_at_15%_85%,rgba(139,92,246,0.38),transparent_48%),radial-gradient(circle_at_85%_85%,rgba(220,38,38,0.38),transparent_48%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
  "Classic Cafe & Specialty Coffee Shop":
    "bg-[radial-gradient(circle_at_18%_22%,rgba(217,119,6,0.55),transparent_45%),radial-gradient(circle_at_82%_28%,rgba(245,158,11,0.4),transparent_50%),radial-gradient(circle_at_50%_88%,rgba(120,53,15,0.4),transparent_55%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
  "Premium Dessert Place & Patisserie":
    "bg-[radial-gradient(circle_at_18%_22%,rgba(236,72,153,0.5),transparent_45%),radial-gradient(circle_at_82%_28%,rgba(244,114,182,0.4),transparent_50%),radial-gradient(circle_at_50%_88%,rgba(157,23,77,0.4),transparent_55%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
  "Cafe-Style Bistro & Lounge Bar (With Alcohol)":
    "bg-[radial-gradient(circle_at_18%_22%,rgba(139,92,246,0.5),transparent_45%),radial-gradient(circle_at_82%_28%,rgba(168,85,247,0.4),transparent_50%),radial-gradient(circle_at_50%_88%,rgba(76,29,149,0.45),transparent_55%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
  "Gourmet Buffet & Live Grill":
    "bg-[radial-gradient(circle_at_18%_22%,rgba(220,38,38,0.5),transparent_45%),radial-gradient(circle_at_82%_28%,rgba(248,113,113,0.4),transparent_50%),radial-gradient(circle_at_50%_88%,rgba(127,29,29,0.4),transparent_55%),linear-gradient(160deg,#0b0b0d_0%,#111113_55%,#0a0a0c_100%)]",
};
