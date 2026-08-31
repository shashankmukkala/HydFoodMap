"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import type { Cafe } from "@/lib/supabase";
import { CATEGORY_ICONS, type Category } from "@/lib/categories";

function iconFor(cafe: Cafe) {
  if (cafe.category && cafe.category in CATEGORY_ICONS) {
    return CATEGORY_ICONS[cafe.category as Category];
  }
  return "☕";
}

type CafeMarkersProps = {
  map: MapLibreMap | null;
  cafes: Cafe[];
  selectedId: string | null;
  onSelect: (cafe: Cafe) => void;
};

export default function CafeMarkers({ map, cafes, selectedId, onSelect }: CafeMarkersProps) {
  const markersRef = useRef<Map<string, { marker: Marker; el: HTMLButtonElement }>>(new globalThis.Map());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!map) return;

    const existing = markersRef.current;
    const nextIds = new Set(cafes.map((c) => c.id));

    for (const [id, entry] of existing) {
      if (!nextIds.has(id)) {
        entry.marker.remove();
        existing.delete(id);
      }
    }

    for (const cafe of cafes) {
      if (existing.has(cafe.id)) continue;

      const el = document.createElement("button");
      el.type = "button";
      el.className = "cafe-pin";
      el.innerHTML = `<span class="cafe-pin-icon">${iconFor(cafe)}</span><span class="cafe-pin-label">${escapeHtml(cafe.name)}</span>`;
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(cafe);
      });

      const marker = new Marker({ element: el, anchor: "bottom" }).setLngLat([cafe.lng, cafe.lat]).addTo(map);

      existing.set(cafe.id, { marker, el });
    }
  }, [map, cafes]);

  useEffect(() => {
    for (const [id, entry] of markersRef.current) {
      entry.el.classList.toggle("cafe-pin-selected", id === selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    const existing = markersRef.current;
    return () => {
      for (const entry of existing.values()) entry.marker.remove();
      existing.clear();
    };
  }, []);

  return null;
}

function escapeHtml(value: string) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
