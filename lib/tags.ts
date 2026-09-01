// Full vibe/amenity vocabulary — sourced from new_data.json's per-cafe
// `tags` field (which already folds price bracket, cuisine, and operating
// features into one array). new_data.json also carries dozens of one-off
// promotional phrases per cafe (e.g. "Famous Banana Pudding", "Royal
// Hyderabadi Buffet") that only ever apply to a single venue — those are
// deliberately NOT included here and get dropped at seed time (see
// scripts/geocode-new-data.mjs) rather than exploding this into a wall of
// one-cafe filter chips. Only tags that recur across multiple cafes made
// the cut. Grouped here so the filter UI can drill down step by step
// (pick a vibe, then a price, then a cuisine...) instead of one flat wall
// of chips.
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
  "Desserts & Gelato",
  "Organic & Natural",
  "Fresh Fruit Ice Creams",
  "Artisanal Creamery",
  "Gourmet Desserts",
  "Multi-cuisine",
  "Fast Food & Pizza",
  "Barbecue & Grills",
  "Bistro Bites & Drinks",
  "Chai & High Tea",
  "Unlimited Buffet",
  "Live Grill",
  "5-Star Luxury Buffet",
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
  "Desserts & Gelato": "🍨",
  "Organic & Natural": "🌱",
  "Fresh Fruit Ice Creams": "🍓",
  "Artisanal Creamery": "🍦",
  "Gourmet Desserts": "🍮",
  "Multi-cuisine": "🍽️",
  "Fast Food & Pizza": "🍕",
  "Barbecue & Grills": "🍖",
  "Bistro Bites & Drinks": "🍹",
  "Chai & High Tea": "🫖",
  "Unlimited Buffet": "🍛",
  "Live Grill": "🔥",
  "5-Star Luxury Buffet": "⭐",
  "24/7 Open": "🕐",
  "Late Night": "🌙",
  "Serves Alcohol": "🍸",
};

export type TagGroupKey = "vibe" | "price" | "cuisine" | "buffet" | "features";

// Order here drives the step-by-step drill-down: Vibe first, then Price,
// then Cuisine, then Buffet & Grill, then Features.
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
      "Desserts & Gelato",
      "Organic & Natural",
      "Fresh Fruit Ice Creams",
      "Artisanal Creamery",
      "Gourmet Desserts",
      "Multi-cuisine",
      "Fast Food & Pizza",
      "Barbecue & Grills",
      "Bistro Bites & Drinks",
      "Chai & High Tea",
    ],
  },
  {
    key: "buffet",
    label: "Buffet & Grill",
    tags: ["Unlimited Buffet", "Live Grill", "5-Star Luxury Buffet"],
  },
  {
    key: "features",
    label: "Features",
    tags: ["24/7 Open", "Late Night", "Serves Alcohol"],
  },
];
