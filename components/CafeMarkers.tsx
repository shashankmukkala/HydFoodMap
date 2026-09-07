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

function initialsFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2)).toUpperCase();
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
      el.setAttribute("aria-label", `Open ${cafe.name}`);

      const icon = document.createElement("span");
      icon.className = "cafe-pin-icon";
      if (cafe.image_url) {
        const image = document.createElement("img");
        image.src = cafe.image_url;
        image.alt = "";
        image.addEventListener("error", () => {
          image.remove();
          icon.textContent = initialsFor(cafe.name);
          icon.classList.add("cafe-pin-icon-fallback");
        });
        icon.appendChild(image);
      } else {
        icon.textContent = initialsFor(cafe.name);
        icon.classList.add("cafe-pin-icon-fallback");
        icon.title = iconFor(cafe);
      }

      const label = document.createElement("span");
      label.className = "cafe-pin-label";
      label.textContent = cafe.name;
      el.append(icon, label);
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
