// Fixed cafe-type taxonomy — what kind of cafe it is, as opposed to
// lib/tags.ts which is about vibe/amenities. Used by the pin form's
// category select and the top bar's "Type" filter, so both stay in sync.
// Matches the three real categories used in data.json (the seed dataset of
// actual Hyderabad cafes/bars). No catch-all "Other" — every real cafe in
// the dataset fits one of these three, and the "no filter" state is
// represented by activeCategory being null (shown as "All"), not a value
// in this list.
export const CATEGORY_OPTIONS = [
  "Classic Cafe & Specialty Coffee Shop",
  "Premium Dessert Place & Patisserie",
  "Cafe-Style Restaurant / Bar (With Alcohol)",
] as const;

export type Category = (typeof CATEGORY_OPTIONS)[number];

export const CATEGORY_ICONS: Record<Category, string> = {
  "Classic Cafe & Specialty Coffee Shop": "☕",
  "Premium Dessert Place & Patisserie": "🍰",
  "Cafe-Style Restaurant / Bar (With Alcohol)": "🍸",
};

// Short display labels — the real category values above are long (they
// match data.json's source categories verbatim, so filtering stays correct
// against the real dataset), but a pill or dropdown chip reading "Cafe-Style
// Restaurant / Bar (With Alcohol)" is unreadable. These are display-only;
// filtering/matching always uses the full CATEGORY_OPTIONS string.
export const CATEGORY_SHORT_LABELS: Record<Category, string> = {
  "Classic Cafe & Specialty Coffee Shop": "Cafe",
  "Premium Dessert Place & Patisserie": "Dessert",
  "Cafe-Style Restaurant / Bar (With Alcohol)": "Bar",
};
