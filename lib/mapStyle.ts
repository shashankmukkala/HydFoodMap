import type { ExpressionSpecification } from "maplibre-gl";

// Used for city-wide data (weather/AQI queries) — not the map's initial view.
export const HYDERABAD_CENTER: [number, number] = [78.4867, 17.385];

// The map opens on Jubilee Hills specifically, since that's where most
// pinned cafes cluster — a generic city-center default would open on a
// mostly-empty area.
export const DEFAULT_MAP_CENTER: [number, number] = [78.4071, 17.4326];
export const DEFAULT_PITCH = 55;
export const DEFAULT_ZOOM = 15.5;
export const DEFAULT_BEARING = -17;

// Telangana viewport guard. MapLibre uses a rectangular camera boundary;
// this deliberately follows the state's outermost extent closely enough to
// keep the browsing experience inside Telangana without allowing a world
// wrap or a zoomed-out national view.
export const TELANGANA_BOUNDS: [[number, number], [number, number]] = [
  [77.15, 15.75],
  [81.45, 20.15],
];
export const TELANGANA_MIN_ZOOM = 8.65;
export const TELANGANA_MAX_ZOOM = 19;

export const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Dark charcoal ramp, keyed off render_height, so taller buildings read as
// subtly lighter — the opposite direction from a light-theme map, where
// height reads as "darker" — so they still stand out with some depth
// instead of the map turning into a flat black wall of silhouettes.
export const BUILDING_HEIGHT_COLOR_RAMP: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "render_height"],
  0,
  "#28282c",
  15,
  "#313136",
  40,
  "#3a3a41",
  80,
  "#45454e",
  150,
  "#55555f",
];

export const BUILDING_LAYER_ID = "building-3d";

// Roads default to the "liberty" style's yellow/cream palette; overridden
// here to very faint, low-alpha whites (higher class = slightly more
// opaque, but even motorways stay subtle) so the road network reads as a
// quiet structural hint rather than a bright grid competing with the
// aurora backdrop and cafe pins for attention. Casings (the outline layers
// under major roads, orange #e9ac77 in the light style) are pushed even
// fainter than their road, and dropped almost to nothing for track/rail —
// present for edge definition at high zoom, invisible at a glance.
export const ROAD_LINE_COLOR_OVERRIDES: Record<string, string> = {
  road_motorway: "rgba(255,255,255,0.30)",
  road_trunk_primary: "rgba(255,255,255,0.30)",
  road_secondary_tertiary: "rgba(255,255,255,0.22)",
  road_minor: "rgba(255,255,255,0.15)",
  road_link: "rgba(255,255,255,0.22)",
  road_service_track: "rgba(255,255,255,0.08)",
  road_path_pedestrian: "rgba(255,255,255,0.10)",
  road_major_rail: "rgba(255,255,255,0.16)",
  road_transit_rail: "rgba(255,255,255,0.16)",
  road_motorway_casing: "rgba(255,255,255,0.06)",
  road_trunk_primary_casing: "rgba(255,255,255,0.06)",
  road_secondary_tertiary_casing: "rgba(255,255,255,0.06)",
  road_link_casing: "rgba(255,255,255,0.06)",
  road_motorway_link_casing: "rgba(255,255,255,0.06)",
  bridge_motorway: "rgba(255,255,255,0.30)",
  bridge_trunk_primary: "rgba(255,255,255,0.30)",
  bridge_secondary_tertiary: "rgba(255,255,255,0.22)",
  bridge_street: "rgba(255,255,255,0.15)",
  bridge_link: "rgba(255,255,255,0.22)",
  bridge_service_track: "rgba(255,255,255,0.08)",
  bridge_path_pedestrian: "rgba(255,255,255,0.10)",
  bridge_major_rail: "rgba(255,255,255,0.16)",
  bridge_transit_rail: "rgba(255,255,255,0.16)",
  bridge_motorway_casing: "rgba(255,255,255,0.06)",
  bridge_trunk_primary_casing: "rgba(255,255,255,0.06)",
  bridge_secondary_tertiary_casing: "rgba(255,255,255,0.06)",
  bridge_link_casing: "rgba(255,255,255,0.06)",
  bridge_motorway_link_casing: "rgba(255,255,255,0.06)",
  tunnel_motorway: "rgba(255,255,255,0.30)",
  tunnel_trunk_primary: "rgba(255,255,255,0.30)",
  tunnel_secondary_tertiary: "rgba(255,255,255,0.22)",
  tunnel_minor: "rgba(255,255,255,0.15)",
  tunnel_link: "rgba(255,255,255,0.22)",
  tunnel_service_track: "rgba(255,255,255,0.08)",
  tunnel_path_pedestrian: "rgba(255,255,255,0.10)",
  tunnel_major_rail: "rgba(255,255,255,0.16)",
  tunnel_transit_rail: "rgba(255,255,255,0.16)",
  tunnel_motorway_casing: "rgba(255,255,255,0.06)",
  tunnel_trunk_primary_casing: "rgba(255,255,255,0.06)",
  tunnel_secondary_tertiary_casing: "rgba(255,255,255,0.06)",
  tunnel_link_casing: "rgba(255,255,255,0.06)",
  tunnel_motorway_link_casing: "rgba(255,255,255,0.06)",
};

// The ivory page colour (--paper in app/globals.css), so the map's own
// ground and the page around it read as one surface rather than two
// different whites.
export const MAP_BACKGROUND_COLOR = "#f7f3ec";

// General-interest POI layers in OpenFreeMap's "liberty" style (poi_r1/r7/r20,
// source-layer "poi") render every OSM point of interest — hospitals,
// pharmacies, shops, restaurants, banks, places of worship, etc. That's too
// busy for a cafe-focused map, so we narrow them down to just: transit
// stations, historical/notable landmarks (Charminar, museums, statues), and
// parks/gardens. "cafe" is deliberately excluded too — our own CafeMarkers
// layer is the curated cafe layer; showing OSM's unmoderated cafe icons
// underneath would just duplicate/clutter it.
// Water/lake features aren't POIs at all (they're the always-on "water" fill
// layer), so they're unaffected by this and don't need listing here.
export const KEEP_POI_CLASSES = [
  "railway",
  "bus",
  "airport",
  "monument",
  "memorial",
  "museum",
  "attraction",
  "art_gallery",
  "park",
  "garden",
];

export const GENERAL_POI_LAYER_IDS = ["poi_r1", "poi_r7", "poi_r20"];
