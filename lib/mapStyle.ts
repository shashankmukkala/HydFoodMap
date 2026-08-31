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

export const OPENFREEMAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Light grey ramp, keyed off render_height, so taller buildings read as
// subtly darker without the map turning into a wall of orange.
export const BUILDING_HEIGHT_COLOR_RAMP: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "render_height"],
  0,
  "#f3f4f6",
  15,
  "#e5e7eb",
  40,
  "#d1d5db",
  80,
  "#b3b8be",
  150,
  "#8f959c",
];

export const BUILDING_LAYER_ID = "building-3d";

// Roads default to the "liberty" style's yellow/cream palette; overridden
// here to a neutral grey hierarchy (darker = higher class) to match the
// grey building palette above. This includes the "casing" (outline) layers
// under major roads — those default to an orange (#e9ac77), not the light
// neutral tone they look like at a glance, so they need overriding too or
// every trunk/motorway/link road keeps a visible orange edge.
export const ROAD_LINE_COLOR_OVERRIDES: Record<string, string> = {
  road_motorway: "#8b8f96",
  road_trunk_primary: "#8b8f96",
  road_secondary_tertiary: "#a8acb3",
  road_minor: "#b8bcc2",
  road_link: "#a8acb3",
  road_service_track: "#c2c6cb",
  road_path_pedestrian: "#cfd3d8",
  road_major_rail: "#9aa0a6",
  road_transit_rail: "#9aa0a6",
  road_motorway_casing: "#e5e7eb",
  road_trunk_primary_casing: "#e5e7eb",
  road_secondary_tertiary_casing: "#e5e7eb",
  road_link_casing: "#e5e7eb",
  road_motorway_link_casing: "#e5e7eb",
  bridge_motorway: "#8b8f96",
  bridge_trunk_primary: "#8b8f96",
  bridge_secondary_tertiary: "#a8acb3",
  bridge_street: "#b8bcc2",
  bridge_link: "#a8acb3",
  bridge_service_track: "#c2c6cb",
  bridge_path_pedestrian: "#cfd3d8",
  bridge_major_rail: "#9aa0a6",
  bridge_transit_rail: "#9aa0a6",
  bridge_motorway_casing: "#e5e7eb",
  bridge_trunk_primary_casing: "#e5e7eb",
  bridge_secondary_tertiary_casing: "#e5e7eb",
  bridge_link_casing: "#e5e7eb",
  bridge_motorway_link_casing: "#e5e7eb",
  tunnel_motorway: "#8b8f96",
  tunnel_trunk_primary: "#8b8f96",
  tunnel_secondary_tertiary: "#a8acb3",
  tunnel_minor: "#b8bcc2",
  tunnel_link: "#a8acb3",
  tunnel_service_track: "#c2c6cb",
  tunnel_path_pedestrian: "#cfd3d8",
  tunnel_major_rail: "#9aa0a6",
  tunnel_transit_rail: "#9aa0a6",
  tunnel_motorway_casing: "#e5e7eb",
  tunnel_trunk_primary_casing: "#e5e7eb",
  tunnel_secondary_tertiary_casing: "#e5e7eb",
  tunnel_link_casing: "#e5e7eb",
  tunnel_motorway_link_casing: "#e5e7eb",
};

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
