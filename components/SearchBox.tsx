"use client";

import { useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Cafe } from "@/lib/supabase";

type PlaceResult = {
  display_name: string;
  lat: string;
  lon: string;
};

type SearchBoxProps = {
  map: MapLibreMap | null;
  cafes: Cafe[];
  onSelectCafe: (cafe: Cafe) => void;
};

export default function SearchBox({ map, cafes, onSelectCafe }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const matchingCafes = query.trim().length >= 2
    ? cafes
        .filter(
          (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.category?.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5)
    : [];

  function search(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setPlaces([]);
      setStatus("idle");
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        if (!res.ok) throw new Error("geocode failed");
        const data = await res.json();
        setPlaces(Array.isArray(data) ? data : []);
        setStatus("idle");
      } catch {
        setPlaces([]);
        setStatus("error");
      }
    }, 350);
  }

  function selectPlace(result: PlaceResult) {
    if (!map) return;
    map.flyTo({
      center: [parseFloat(result.lon), parseFloat(result.lat)],
      zoom: 16.5,
      pitch: 55,
      essential: true,
    });
    setPlaces([]);
    setQuery(result.display_name);
  }

  function selectCafe(cafe: Cafe) {
    onSelectCafe(cafe);
    setPlaces([]);
    setQuery(cafe.name);
  }

  const showDropdown = query.trim().length >= 2 && (matchingCafes.length > 0 || places.length > 0 || status !== "idle");

  return (
    <div className="relative w-full">
      <svg
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="9" cy="9" r="6" />
        <path d="M17 17l-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Search cafes, areas, vibes..."
        className="w-full rounded-full border border-black/5 bg-neutral-100 py-2.5 pr-4 pl-9 text-sm text-neutral-700 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-white/5 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-800"
      />
      {showDropdown && (
        <div className="panel-elevated absolute top-full mt-2 max-h-80 w-full overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900">
          {matchingCafes.map((cafe) => (
            <button
              key={cafe.id}
              onClick={() => selectCafe(cafe)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-amber-50 dark:text-neutral-200 dark:hover:bg-amber-950/50"
            >
              <span>☕</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{cafe.name}</span>
                {cafe.category && <span className="text-neutral-400"> · {cafe.category}</span>}
              </span>
            </button>
          ))}

          {status === "loading" && <div className="px-4 py-2 text-sm text-neutral-400">Searching…</div>}
          {status === "error" && (
            <div className="px-4 py-2 text-sm text-red-500">Couldn&apos;t reach the map search service.</div>
          )}
          {status === "idle" && places.length === 0 && matchingCafes.length === 0 && (
            <div className="px-4 py-2 text-sm text-neutral-400">No results.</div>
          )}
          {places.map((result) => (
            <button
              key={`${result.lat},${result.lon}`}
              onClick={() => selectPlace(result)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-amber-50 dark:text-neutral-200 dark:hover:bg-amber-950/50"
            >
              <span>📍</span>
              <span className="truncate">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
