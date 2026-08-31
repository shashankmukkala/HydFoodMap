// Full vibe/amenity vocabulary — sourced from new_data.json's per-cafe
// `tags` field (which already folds price bracket, cuisine, and operating
// features into one array), merged onto local-data/cafes.json and
// scripts/seed-cafes.json by scripts/merge-tags.mjs. Grouped here so the
// filter UI can drill down step by step (pick a vibe, then a price, then a
// cuisine...) instead of one flat wall of chips.
export const TAG_OPTIONS = [
  "Indoor",
  "Outdoor",
  "Rooftop",
  "Quiet",
  "Lively",
  "Pet Friendly",
  "Work Friendly",
  "Budget",
  "Mid-range",
  "Premium",
  "Cafe Food & Coffee",
  "Specialty Coffee",
  "Desserts & Bakes",
  "Multi-cuisine",
  "Fast Food & Pizza",
  "Barbecue & Grills",
  "Bistro Bites & Drinks",
  "Chai & High Tea",
  "24/7 Open",
  "Late Night",
  "Serves Alcohol",
] as const;

export type Tag = (typeof TAG_OPTIONS)[number];

export const TAG_ICONS: Record<Tag, string> = {
  Indoor: "🏠",
  Outdoor: "🌿",
  Rooftop: "🏙️",
  Quiet: "🔇",
  Lively: "🎉",
  "Pet Friendly": "🐾",
  "Work Friendly": "💻",
  Budget: "💵",
  "Mid-range": "💰",
  Premium: "💎",
  "Cafe Food & Coffee": "☕",
  "Specialty Coffee": "🌟",
  "Desserts & Bakes": "🍰",
  "Multi-cuisine": "🍽️",
  "Fast Food & Pizza": "🍕",
  "Barbecue & Grills": "🍖",
  "Bistro Bites & Drinks": "🍹",
  "Chai & High Tea": "🫖",
  "24/7 Open": "🕐",
  "Late Night": "🌙",
  "Serves Alcohol": "🍸",
};

export type TagGroupKey = "vibe" | "price" | "cuisine" | "features";

// Order here drives the step-by-step drill-down: Vibe first, then Price,
// then Cuisine, then Features.
export const TAG_GROUPS: { key: TagGroupKey; label: string; tags: Tag[] }[] = [
  {
    key: "vibe",
    label: "Vibe",
    tags: ["Indoor", "Outdoor", "Rooftop", "Quiet", "Lively", "Pet Friendly", "Work Friendly"],
  },
  {
    key: "price",
    label: "Price",
    tags: ["Budget", "Mid-range", "Premium"],
  },
  {
    key: "cuisine",
    label: "Cuisine",
    tags: [
      "Cafe Food & Coffee",
      "Specialty Coffee",
      "Desserts & Bakes",
      "Multi-cuisine",
      "Fast Food & Pizza",
      "Barbecue & Grills",
      "Bistro Bites & Drinks",
      "Chai & High Tea",
    ],
  },
  {
    key: "features",
    label: "Features",
    tags: ["24/7 Open", "Late Night", "Serves Alcohol"],
  },
];
