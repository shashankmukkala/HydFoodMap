import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl";
import { CATEGORY_OPTIONS, type Category } from "@/lib/categories";
import { MAP_BACKGROUND_COLOR } from "@/lib/mapStyle";

/**
 * The map's place dots: GPU circle layers instead of DOM markers.
 *
 * WHY THIS REPLACED DOM MARKERS. Every cafe used to be a real
 * `<button>` with an `<img>` and a text label inside it, which MapLibre
 * repositioned on every frame of every pan and zoom. That is layout and
 * paint on the main thread, per pin, per frame, and it is what made the
 * map feel heavy next to a map drawing its points on the GPU. Circle
 * layers move with the camera for free: during a pan, JavaScript does
 * nothing at all.
 *
 * It also retires the initials fallback. Five of our eighty-five places
 * have a photo, so ~94% of pins rendered as two grey letters — which
 * reads as missing data rather than as a design. A coloured dot reads as
 * a system, and costs no content.
 *
 * TWO LAYERS OF THE SAME DATA. `lights` is a small blurred dot that
 * carries density and texture when zoomed out, where individual identity
 * is not useful. `points` is a crisp, stroked, category-coloured dot that
 * fades in as you arrive. They overlap and trade places between zoom 13.4
 * and 14.6, so neither ever pops into existence.
 *
 * THE STROKE IS THE WHOLE TRICK. `points` is stroked in the *basemap's
 * own background colour*, not in a border colour. That is a knockout
 * ring: it punches a gap between a 3px dot and whatever road, label or
 * park polygon sits under it, which is what lets a dot stay this small
 * and still be legible on a busy map.
 *
 * Numbers, zoom stops, blur and opacity ramps here are ported from
 * nyc-foodmap.vercel.app, which solves this problem unusually well. Its
 * palette ships in two variants and we take the `day` one, because our
 * basemap is light paper — the `night` values are kept because
 * lib/darkenMapStyle.ts is still in the tree and one call brings the dark
 * map back.
 */

export type DotTheme = "day" | "night";

/**
 * Their seven-kind palette, both variants.
 *
 * The day colours are not the night colours darkened — they are more
 * saturated and considerably deeper, because a pale dot that reads
 * beautifully on near-black disappears on paper.
 */
const KIND_COLORS = {
  night: {
    cafe: "#F2A33A",
    bakery: "#E7C27D",
    sweets: "#EE93AB",
    juice: "#A3D08C",
    drinks: "#B39DE3",
    restaurant: "#EFE3CF",
    unclassified: "#8A847B",
  },
  day: {
    cafe: "#B8661A",
    bakery: "#9A7424",
    sweets: "#B4506C",
    juice: "#4C8538",
    drinks: "#6B55A6",
    restaurant: "#3A332A",
    unclassified: "#9A9286",
  },
} as const satisfies Record<DotTheme, Record<string, string>>;

type Kind = keyof (typeof KIND_COLORS)["day"];

/**
 * Our four categories onto their seven kinds.
 *
 * Three are exact matches. "Specialty Coffee" is the judgement call: their
 * `cafe` amber is already spent on our general Cafe bucket, their `bakery`
 * gold sits too close to it to tell apart at 3px, so it takes `drinks`
 * violet — the most distinct hue left, and "drinks-first" is the nearest
 * thing they have to a coffee-led brew bar. Swap it for `juice` green here
 * if violet reads wrong against Hyderabad's basemap.
 */
const CATEGORY_KIND: Record<Category, Kind> = {
  Cafe: "cafe",
  "Specialty Coffee": "drinks",
  "Dessert & Bakery": "sweets",
  "Bistro & Kitchen": "restaurant",
};

/** Accent used for the selected place's halo and ring. */
const ACCENT: Record<DotTheme, string> = { night: "#F2A33A", day: "#A85A12" };

/**
 * What the knockout stroke knocks out against.
 *
 * Deliberately our own MAP_BACKGROUND_COLOR rather than their #FBF8F2:
 * the stroke's whole job is to match the basemap it sits on, and
 * components/Map.tsx repaints the style's background to our paper.
 */
const BACKDROP: Record<DotTheme, string> = { night: "#0E1116", day: MAP_BACKGROUND_COLOR };

const LABEL_COLOR: Record<DotTheme, string> = { night: "#F2EADF", day: "#1D1A16" };
const LABEL_HALO: Record<DotTheme, string> = {
  night: "rgba(14,17,22,0.9)",
  day: "rgba(247,243,236,0.95)",
};

/**
 * How far a place that does not match the current filter is dimmed.
 *
 * Their value, and the reason to copy it rather than hide non-matches:
 * filtering a map by removing pins deletes the city's texture, so you
 * lose all sense of where the matches sit relative to everything else.
 * Dimming keeps the shape of Hyderabad on screen and makes a filter read
 * as focus rather than as deletion.
 */
const DIM_FACTOR = 0.18;

/**
 * The same cascade 0036_normalize_cafe_categories.sql applies in Postgres,
 * in the same order.
 *
 * An exact match on the current taxonomy is tried first and is what every
 * row in the real database hits, because 0036 normalised them and added a
 * CHECK constraint. The regexes are for everything that has not been
 * through it — above all the dev seed file, whose 140 rows still carry the
 * pre-0036 taxonomy ("Classic Cafe & Specialty Coffee Shop", "Gourmet
 * Buffet & Live Grill", ...). Without them every seeded dot fell through to
 * unclassified grey, so the whole palette was invisible in local
 * development even though nothing was technically broken.
 *
 * Deliberately a copy of the migration's logic rather than a second
 * taxonomy of its own: if these two disagree, a dot is a different colour
 * from the category its own detail card shows.
 */
export function kindIndexFor(category: string | null): number {
  const UNCLASSIFIED = CATEGORY_OPTIONS.length;
  if (!category || !category.trim()) return UNCLASSIFIED;

  const exact = (CATEGORY_OPTIONS as readonly string[]).indexOf(category);
  if (exact !== -1) return exact;

  const indexOf = (name: Category) => CATEGORY_OPTIONS.indexOf(name);
  if (/(patisserie|bakery|bakehouse|bakes|dessert|chocolat|ice cream|creamery)/i.test(category)) {
    return indexOf("Dessert & Bakery");
  }
  if (
    /(bistro|restaurant|continental|italian|multi-cuisine|kitchen|pizzeria|pizzateria|thai|asian|fast food|cafe bar)/i.test(
      category
    )
  ) {
    return indexOf("Bistro & Kitchen");
  }
  if (/(specialty coffee|latte art|vietnamese coffee)/i.test(category)) {
    return indexOf("Specialty Coffee");
  }
  // The migration's own fallthrough: anything that names no stronger signal
  // is a cafe, which is the honest answer rather than "unknown".
  return indexOf("Cafe");
}

/** `["match", ["get","k"], 0, colour, 1, colour, …, unclassified]`. */
function colorExpression(theme: DotTheme): ExpressionSpecification {
  const palette = KIND_COLORS[theme];
  const expression: unknown[] = ["match", ["get", "k"]];
  CATEGORY_OPTIONS.forEach((category, index) => {
    expression.push(index, palette[CATEGORY_KIND[category]]);
  });
  expression.push(palette.unclassified);
  return expression as unknown as ExpressionSpecification;
}

/**
 * A zoom-interpolated opacity ramp where, when a filter is active, every
 * stop value is scaled down for features that do not match.
 *
 * Doing it inside the ramp rather than as a second layer or a filter is
 * what makes dimming free: the value is evaluated per feature on the GPU,
 * so toggling a filter is one paint-property update, not a re-tessellation
 * of the source.
 */
function dimmableOpacity(
  stops: readonly (readonly [number, number])[],
  dimming: boolean,
  factor = DIM_FACTOR
): ExpressionSpecification {
  const expression: unknown[] = ["interpolate", ["linear"], ["zoom"]];
  for (const [zoom, value] of stops) {
    expression.push(
      zoom,
      // `d` is 0 for a feature that matches the active filter, 1 otherwise.
      dimming ? ["case", ["==", ["get", "d"], 0], value, value * factor] : value
    );
  }
  return expression as unknown as ExpressionSpecification;
}

export const DOT_SOURCES = { lights: "cafe-lights", points: "cafe-points", showcase: "cafe-showcase" } as const;

export const DOT_LAYERS = {
  glow: "cafe-lights-glow",
  lights: "cafe-lights",
  points: "cafe-points",
  halo: "cafe-show-halo",
  ring: "cafe-show-ring",
  label: "cafe-show-label",
} as const;

/**
 * Layers a click may land on and mean "open this place".
 *
 * components/Map.tsx reads this so its own map-wide click handler can tell
 * a click on a dot from a click on empty map. The DOM markers this
 * replaced could call stopPropagation; a circle layer cannot, and without
 * this the same click would select a cafe and then immediately deselect it.
 */
export const DOT_HIT_LAYERS: readonly string[] = [DOT_LAYERS.points, DOT_LAYERS.lights];

type CirclePaint = CircleLayerSpecification["paint"];
type SymbolPaint = SymbolLayerSpecification["paint"];

/**
 * Keyed by layer id so the component can hand a layer its own paint
 * without a lookup table. Annotating the return is what keeps the array
 * literals below mutable — MapLibre's paint types reject readonly tuples,
 * so an `as const` here would make every expression unassignable.
 */
export type DotPaint = {
  [DOT_LAYERS.glow]: CirclePaint;
  [DOT_LAYERS.lights]: CirclePaint;
  [DOT_LAYERS.points]: CirclePaint;
  [DOT_LAYERS.halo]: CirclePaint;
  [DOT_LAYERS.ring]: CirclePaint;
  [DOT_LAYERS.label]: SymbolPaint;
};

/** Paint for every dot layer, for one theme and one filter state. */
export function dotPaint(theme: DotTheme, dimming: boolean): DotPaint {
  const color = colorExpression(theme);
  const accent = ACCENT[theme];
  const backdrop = BACKDROP[theme];
  const isNight = theme === "night";

  return {
    /**
     * A wide, fully blurred bloom under `lights`, so a dense strip of
     * cafes glows as one mass rather than as separate specks.
     *
     * Its opacity stops are all zero in day mode — on paper a bloom reads
     * as a smudge, so the layer is present and draws nothing. Kept rather
     * than dropped so the dark map, if it comes back, needs no new code.
     */
    [DOT_LAYERS.glow]: {
      "circle-color": color,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3.2, 11, 4.6, 13, 8],
      "circle-blur": 1,
      "circle-opacity": dimmableOpacity(
        [
          [9, isNight ? 0.1 : 0],
          [12.5, isNight ? 0.12 : 0],
          [13.6, 0],
        ],
        dimming,
        0.1
      ),
    },

    /** The zoomed-out dot: 1.2px at the city scale, gone by 14.6. */
    [DOT_LAYERS.lights]: {
      "circle-color": color,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.2, 11, 1.8, 13, 2.7, 14.5, 3.2],
      "circle-blur": isNight ? 0.5 : 0.1,
      "circle-opacity": dimmableOpacity(
        [
          [9, isNight ? 0.66 : 0.55],
          [12.5, isNight ? 0.88 : 0.7],
          [14, 0.5],
          [14.6, 0],
        ],
        dimming
      ),
    },

    /** The real dot: 3.2px radius at z13 up to 8px at z18, knocked out. */
    [DOT_LAYERS.points]: {
      "circle-color": color,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 3.2, 16, 6, 18, 8],
      "circle-stroke-color": backdrop,
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 0.8, 16, 1.6],
      "circle-opacity": dimmableOpacity(
        [
          [12.8, 0],
          [13.4, 1],
        ],
        dimming,
        0.25
      ),
      "circle-stroke-opacity": dimmableOpacity(
        [
          [12.8, 0],
          [13.4, 1],
        ],
        dimming,
        0.25
      ),
    },

    /** Selected: a soft accent bloom, visible at every zoom. */
    [DOT_LAYERS.halo]: {
      "circle-color": accent,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 14, 13, 17, 20],
      "circle-blur": 0.7,
      "circle-opacity": isNight ? 0.22 : 0.16,
    },

    /** Selected: the dot again, ringed in accent so it survives the bloom. */
    [DOT_LAYERS.ring]: {
      "circle-color": color,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.6, 14, 5.5, 17, 8.5],
      "circle-stroke-color": accent,
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 14, 2.2, 17, 3],
    },

    /** Selected: its name, only ever one on screen. */
    [DOT_LAYERS.label]: {
      "text-color": LABEL_COLOR[theme],
      "text-halo-color": LABEL_HALO[theme],
      "text-halo-width": 1.6,
    },
  };
}
