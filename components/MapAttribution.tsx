"use client";

import { useState } from "react";

// Small "i" badge standing in for MapLibre's built-in attribution control,
// which renders as a full text banner with no reliable way to keep it
// collapsed. Required attribution (OpenFreeMap / OSM) lives in the popover.
export default function MapAttribution() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-10">
      {open && (
        <div className="panel-elevated mb-2 w-max max-w-[220px] rounded-xl bg-white/95 px-3 py-2 text-[10px] leading-snug text-neutral-500 backdrop-blur dark:bg-neutral-900/95 dark:text-neutral-400">
          <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
            OpenFreeMap
          </a>
          {" · "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            © OpenStreetMap contributors
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Map data attribution"
        aria-expanded={open}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[11px] font-semibold text-neutral-500 shadow-sm backdrop-blur hover:text-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        i
      </button>
    </div>
  );
}
