"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DataDrivenPropertyValueSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";
import type { Cafe } from "@/lib/supabase";
import { DOT_LAYERS, DOT_SOURCES, dotPaint, kindIndexFor, type DotTheme } from "@/lib/mapDots";

/**
 * Cafe dots, drawn as GPU circle layers.
 *
 * See lib/mapDots.ts for the palette, the zoom ramps and why this replaced
 * one DOM `<button>` per cafe. This file is the plumbing: build the
 * GeoJSON, add the layers once, and keep three sources in step with props.
 *
 * Returns null — it renders nothing into React's tree and owns map state
 * through effects, the same shape the DOM-marker version had.
 */

/** The basemap is dark; see lib/mapDots for the day variant. */
const THEME: DotTheme = "night";

type CafeMarkersProps = {
  map: MapLibreMap | null;
  /**
   * Every cafe, not just the ones matching the filter. Non-matching places
   * are dimmed rather than removed, so they have to be here to be dimmed.
   */
  cafes: Cafe[];
  /**
   * Ids matching the active filter, or null when nothing is filtered.
   * Null is not the same as "every id": it switches the opacity ramps to
   * plain numbers instead of per-feature conditionals.
   */
  activeIds: Set<string> | null;
  selectedId: string | null;
  onSelect: (cafe: Cafe) => void;
};

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

/**
 * Whether this map can take a layer right now.
 *
 * Every call is wrapped because a *removed* map throws from these rather
 * than returning false, and a removed map is routine here: React's strict
 * mode mounts components twice in development, so components/Map.tsx
 * builds a map, removes it, and builds a second one. The first map can
 * already have reached `load` and been handed to this component before it
 * is torn down, which leaves us holding a dead reference.
 *
 * This being unguarded is what broke the dots: the cleanup called
 * `map.getStyle()` on that dead map, which threw, and a throwing effect
 * cleanup aborts the commit — so the install for the *second* map never
 * ran, and no layer was ever added.
 */
function canTakeLayers(map: MapLibreMap): boolean {
  try {
    // isStyleLoaded is typed `boolean | void` in this version of MapLibre,
    // so it is compared rather than trusted as a boolean.
    return Boolean(map.getStyle()) && map.isStyleLoaded() === true;
  } catch {
    return false;
  }
}

/** True once the map is gone for good and cleanup should not touch it. */
function isDead(map: MapLibreMap): boolean {
  try {
    return !map.getStyle();
  } catch {
    return true;
  }
}

const DEV = process.env.NODE_ENV !== "production";

/**
 * One feature per cafe, with deliberately terse property names.
 *
 * `k` kind index, `d` dimmed flag, `n` name. The payload is re-serialised
 * and re-tessellated whenever it changes, so the names are part of the
 * cost — and this is the convention the expressions in mapDots read.
 */
function toCollection(cafes: Cafe[], activeIds: Set<string> | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: cafes
      // A pin with no coordinate cannot be drawn, and a NaN in the
      // coordinates array invalidates the tile rather than the one feature.
      .filter((cafe) => Number.isFinite(cafe.lng) && Number.isFinite(cafe.lat))
      .map((cafe) => ({
        type: "Feature" as const,
        id: cafe.id,
        geometry: { type: "Point" as const, coordinates: [cafe.lng, cafe.lat] },
        properties: {
          id: cafe.id,
          n: cafe.name,
          k: kindIndexFor(cafe.category),
          d: !activeIds || activeIds.has(cafe.id) ? 0 : 1,
        },
      })),
  };
}

export default function CafeMarkers({ map, cafes, activeIds, selectedId, onSelect }: CafeMarkersProps) {
  /**
   * State, not a ref, so the effects that push data re-run once the layers
   * exist. The layers are normally installed synchronously — MapExperience
   * hands us the map from inside MapLibre's `load` — but on a style reload
   * install defers to `styledata`, and a ref would leave the sources empty
   * with nothing to re-trigger them.
   */
  const [installed, setInstalled] = useState(false);

  // Read by the map's own listeners, which are registered once. Assigned
  // in an effect rather than during render: a ref write during render is
  // not safe under concurrent rendering, and React's lint rules reject it.
  const cafesRef = useRef(cafes);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    cafesRef.current = cafes;
  }, [cafes]);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Read only for the layers' first paint; a dedicated effect below keeps
  // it current without rebuilding them.
  const dimmingAtInstallRef = useRef(activeIds !== null);
  useEffect(() => {
    dimmingAtInstallRef.current = activeIds !== null;
  }, [activeIds]);

  // ---- Add sources and layers, once per map --------------------------
  useEffect(() => {
    if (!map) return;

    let cancelled = false;

    function install() {
      if (cancelled || !map) return;

      // Adding a layer before the style's own layers exist throws, so wait
      // and try again. Both events are listened for because `styledata`
      // fires while a style is still settling and can arrive when the map
      // is not yet ready, whereas `idle` is guaranteed to come after it is.
      if (!canTakeLayers(map)) {
        if (isDead(map)) return;
        map.once("styledata", install);
        map.once("idle", install);
        if (DEV) console.info("[CafeMarkers] style not ready; retrying on styledata/idle");
        return;
      }

      // Idempotent rather than bailing when something is already there.
      // Bailing was a silent no-op that left `installed` false forever, so
      // the effects that push data never ran and the map stayed empty.
      try {
        for (const id of Object.values(DOT_LAYERS)) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        for (const id of Object.values(DOT_SOURCES)) {
          if (map.getSource(id)) map.removeSource(id);
        }
      } catch {
        // A partially torn-down style; the adds below will surface it.
      }

      const paint = dotPaint(THEME, dimmingAtInstallRef.current);

      // `lights` is simplified harder than `points` on purpose: it only
      // ever draws a blurred 1–3px dot, so geometry detail that survives
      // tessellation is detail nobody can see. `points` keeps a bigger
      // buffer so a dot near a tile edge is not clipped mid-pan.
      map.addSource(DOT_SOURCES.lights, {
        type: "geojson",
        data: emptyCollection(),
        buffer: 16,
        tolerance: 0.6,
      });
      map.addSource(DOT_SOURCES.points, { type: "geojson", data: emptyCollection(), buffer: 32 });
      map.addSource(DOT_SOURCES.showcase, { type: "geojson", data: emptyCollection() });

      map.addLayer({ id: DOT_LAYERS.glow, type: "circle", source: DOT_SOURCES.lights, paint: paint[DOT_LAYERS.glow] });
      map.addLayer({ id: DOT_LAYERS.lights, type: "circle", source: DOT_SOURCES.lights, paint: paint[DOT_LAYERS.lights] });
      map.addLayer({ id: DOT_LAYERS.points, type: "circle", source: DOT_SOURCES.points, paint: paint[DOT_LAYERS.points] });

      // Selection draws above the field, so a selected dot is never buried
      // under a neighbour where places sit close together.
      map.addLayer({ id: DOT_LAYERS.halo, type: "circle", source: DOT_SOURCES.showcase, paint: paint[DOT_LAYERS.halo] });
      map.addLayer({ id: DOT_LAYERS.ring, type: "circle", source: DOT_SOURCES.showcase, paint: paint[DOT_LAYERS.ring] });
      map.addLayer({
        id: DOT_LAYERS.label,
        type: "symbol",
        source: DOT_SOURCES.showcase,
        layout: {
          "text-field": ["get", "n"],
          // Served by the same glyph endpoint our style already uses.
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
          "text-anchor": "top",
          // Clears the ring at its widest, so the name never sits on the dot.
          "text-offset": [0, 1.1],
          "text-max-width": 9,
          // One label, and it belongs to the thing just clicked, so it is
          // never a candidate for collision removal.
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: paint[DOT_LAYERS.label],
      });

      setInstalled(true);
      if (DEV) console.info("[CafeMarkers] dot layers installed");
    }

    install();

    return () => {
      cancelled = true;
      setInstalled(false);
      map.off("styledata", install);
      map.off("idle", install);

      // Nothing in here may throw. React aborts the commit when an effect
      // cleanup does, which previously meant the next map never got its
      // layers — see canTakeLayers above.
      if (isDead(map)) return;
      try {
        // Order matters: a source cannot be removed while a layer uses it.
        for (const id of Object.values(DOT_LAYERS)) {
          if (map.getLayer(id)) map.removeLayer(id);
        }
        for (const id of Object.values(DOT_SOURCES)) {
          if (map.getSource(id)) map.removeSource(id);
        }
      } catch (error) {
        if (DEV) console.info("[CafeMarkers] cleanup skipped:", error);
      }
    };
  }, [map]);

  // ---- Feed the two field sources ------------------------------------
  useEffect(() => {
    if (!map || !installed) return;
    const collection = toCollection(cafes, activeIds);
    // Both layers draw the same places at different zooms, so they read the
    // same features — the sources differ only in simplification.
    for (const id of [DOT_SOURCES.lights, DOT_SOURCES.points]) {
      (map.getSource(id) as GeoJSONSource | undefined)?.setData(collection);
    }
    if (DEV) {
      console.info(
        `[CafeMarkers] ${collection.features.length} dots pushed (of ${cafes.length} cafes)`
      );
    }
  }, [map, installed, cafes, activeIds]);

  // ---- Switch the opacity ramps when a filter turns on or off --------
  useEffect(() => {
    if (!map || !installed) return;
    const paint = dotPaint(THEME, activeIds !== null);
    for (const layerId of [DOT_LAYERS.glow, DOT_LAYERS.lights, DOT_LAYERS.points] as const) {
      if (!map.getLayer(layerId)) continue;
      const layerPaint = paint[layerId] as Record<
        string,
        DataDrivenPropertyValueSpecification<number> | undefined
      >;
      // `as const` so these stay literal keys — setPaintProperty is typed
      // on the paint-property union, not on string.
      for (const property of ["circle-opacity", "circle-stroke-opacity"] as const) {
        if (property in layerPaint) {
          map.setPaintProperty(layerId, property, layerPaint[property]);
        }
      }
    }
  }, [map, installed, activeIds]);

  // ---- The selected place --------------------------------------------
  useEffect(() => {
    if (!map || !installed) return;
    const source = map.getSource(DOT_SOURCES.showcase) as GeoJSONSource | undefined;
    if (!source) return;

    const selected = selectedId ? cafes.find((cafe) => cafe.id === selectedId) : null;
    // activeIds is deliberately not passed: the selected place is never
    // dimmed, even when it falls outside the current filter.
    source.setData(selected ? toCollection([selected], null) : emptyCollection());
  }, [map, installed, cafes, selectedId]);

  // ---- Clicking and hovering a dot -----------------------------------
  useEffect(() => {
    if (!map) return;

    function handleClick(event: MapLayerMouseEvent) {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id !== "string") return;
      const cafe = cafesRef.current.find((candidate) => candidate.id === id);
      if (cafe) onSelectRef.current(cafe);
    }

    function showPointer() {
      map!.getCanvas().style.cursor = "pointer";
    }
    function clearPointer() {
      map!.getCanvas().style.cursor = "";
    }

    // Both dot layers are clickable, so a place can be opened at the
    // zoomed-out `lights` scale too rather than only once `points` has
    // faded in.
    const layers = [DOT_LAYERS.points, DOT_LAYERS.lights] as const;
    for (const layer of layers) {
      map.on("click", layer, handleClick);
      map.on("mouseenter", layer, showPointer);
      map.on("mouseleave", layer, clearPointer);
    }

    return () => {
      for (const layer of layers) {
        map.off("click", layer, handleClick);
        map.off("mouseenter", layer, showPointer);
        map.off("mouseleave", layer, clearPointer);
      }
    };
  }, [map]);

  return null;
}
