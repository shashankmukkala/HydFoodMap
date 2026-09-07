// Vibe/amenity vocabulary — must match the actual `tags` values stored on
// cafes in the database exactly (Cafe.tags is a plain string[], not
// validated against this list at write time), or a filter chip silently
// matches zero cafes forever. This list was regenerated from a direct
// query of every distinct tag actually present across all cafes — see
// the tag-audit that replaced this file; previously it carried an older
// dataset's tag names (e.g. "Outdoor" vs the real "Outdoor Seating",
// "Desserts & Bakes"/"Desserts & Gelato" vs the real "Desserts") that no
// longer matched anything after the cafe data was replaced.
export const TAG_OPTIONS = [
  "Outdoor Seating",
  "Rooftop",
  "Lakeside",
  "Instagrammable",
  "Family Friendly",
  "Pet Friendly",
  "Work Friendly",
  "Specialty Coffee",
  "Desserts",
  "Bakery",
  "Brunch",
  "Vegetarian Options",
  "Vegan Options",
  "WiFi",
  "Parking",
  "Reservations",
  "Serves Alcohol",
  "Live Music",
  "Late Night",
] as const;

export type Tag = (typeof TAG_OPTIONS)[number];

export const TAG_ICONS: Record<Tag, string> = {
  "Outdoor Seating": "🌿",
  Rooftop: "🏙️",
  Lakeside: "🌊",
  Instagrammable: "📸",
  "Family Friendly": "👨‍👩‍👧",
  "Pet Friendly": "🐾",
  "Work Friendly": "💻",
  "Specialty Coffee": "🌟",
  Desserts: "🍰",
  Bakery: "🥐",
  Brunch: "🥞",
  "Vegetarian Options": "🥗",
  "Vegan Options": "🌱",
  WiFi: "📶",
  Parking: "🅿️",
  Reservations: "📅",
  "Serves Alcohol": "🍸",
  "Live Music": "🎵",
  "Late Night": "🌙",
};

export type TagGroupKey = "vibe" | "food" | "amenities" | "features";

// Order here drives the step-by-step drill-down: Vibe first, then Food &
// Drink, then Amenities, then Features.
export const TAG_GROUPS: { key: TagGroupKey; label: string; tags: Tag[] }[] = [
  {
    key: "vibe",
    label: "Vibe",
    tags: ["Outdoor Seating", "Rooftop", "Lakeside", "Instagrammable", "Family Friendly", "Pet Friendly", "Work Friendly"],
  },
  {
    key: "food",
    label: "Food & Drink",
    tags: ["Specialty Coffee", "Desserts", "Bakery", "Brunch", "Vegetarian Options", "Vegan Options"],
  },
  {
    key: "amenities",
    label: "Amenities",
    tags: ["WiFi", "Parking", "Reservations"],
  },
  {
    key: "features",
    label: "Features",
    tags: ["Serves Alcohol", "Live Music", "Late Night"],
  },
];
