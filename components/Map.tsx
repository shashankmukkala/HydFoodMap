"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  type ExpressionSpecification,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/mapWorker";
import {
  BUILDING_HEIGHT_COLOR_RAMP,
  DEFAULT_ZOOM,
  GENERAL_POI_LAYER_IDS,
  DEFAULT_MAP_CENTER,
  KEEP_POI_CLASSES,
  OPENFREEMAP_STYLE_URL,
  ROAD_LINE_COLOR_OVERRIDES,
} from "@/lib/mapStyle";

type PlacingMode = "cafe" | "billboard" | null;

type MapProps = {
  placingMode: PlacingMode;
  onMapClick: (lngLat: { lng: number; lat: number }) => void;
  onMapReady: (map: MapLibreMap) => void;
};

export default function Map({ placingMode, onMapClick, onMapReady }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_ZOOM,
      // Starts top-down (2D), not tilted — Jubilee Hills has enough cafe
      // pins clustered together that a 3D tilt makes them overlap and hide
      // each other. The 3D toggle in the top bar still switches to
      // DEFAULT_PITCH/DEFAULT_BEARING on request.
      pitch: 0,
      bearing: 0,
      // MapLibre's built-in attribution control renders a full text
      // banner over the map with no way to keep it reliably collapsed —
      // replaced with our own small "i" badge (see MapAttribution.tsx).
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new NavigationControl({ visualizePitch: true }), "bottom-right");

    map.on("load", () => {
      const layers = map.getStyle().layers ?? [];
      const buildingLayer = layers.find(
        (layer) => layer.type === "fill-extrusion" && layer.id.includes("building")
      );
      if (buildingLayer) {
        map.setPaintProperty(buildingLayer.id, "fill-extrusion-color", BUILDING_HEIGHT_COLOR_RAMP);
      }

      for (const layer of layers) {
        const color = ROAD_LINE_COLOR_OVERRIDES[layer.id];
        if (color && layer.type === "line") {
          map.setPaintProperty(layer.id, "line-color", color);
        }
      }

      for (const layerId of GENERAL_POI_LAYER_IDS) {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer || layer.type !== "symbol") continue;
        const existingFilter = (layer.filter ?? true) as ExpressionSpecification | boolean;
        const combined: ExpressionSpecification = [
          "all",
          existingFilter,
          ["in", ["get", "class"], ["literal", KEEP_POI_CLASSES]],
        ];
        map.setFilter(layerId, combined);
      }

      onMapReady(map);
    });

    map.on("click", (e: MapLayerMouseEvent) => {
      onMapClickRef.current(e.lngLat);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = placingMode ? "crosshair" : "";
  }, [placingMode]);

  return <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }} />;
}
