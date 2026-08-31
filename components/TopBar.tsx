"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import SearchBox from "@/components/SearchBox";
import { DEFAULT_BEARING, DEFAULT_PITCH } from "@/lib/mapStyle";
import { useTheme } from "@/lib/useTheme";
import { useAuth } from "@/lib/useAuth";
import { useRequireAuth } from "@/lib/AuthGate";
import WeatherWidget from "@/components/WeatherWidget";
import AirQualityWidget from "@/components/AirQualityWidget";
import { CATEGORY_ICONS, CATEGORY_OPTIONS, CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import { TAG_GROUPS, TAG_ICONS, type Tag } from "@/lib/tags";
import type { Cafe } from "@/lib/supabase";

type TopBarProps = {
  map: MapLibreMap | null;
  cafes: Cafe[];
  onSelectCafe: (cafe: Cafe) => void;
  onMenuClick: () => void;
  activeCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
  activeTags: Set<Tag>;
  onToggleTag: (tag: Tag) => void;
};

export default function TopBar({
  map,
  cafes,
  onSelectCafe,
  onMenuClick,
  activeCategory,
  onSelectCategory,
  activeTags,
  onToggleTag,
}: TopBarProps) {
  const [is3D, setIs3D] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [vibeOpen, setVibeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);
  const vibeRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn, phone } = useAuth();
  const requireAuth = useRequireAuth();

  useEffect(() => {
    if (!typeOpen && !vibeOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (typeOpen && typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
      if (vibeOpen && vibeRef.current && !vibeRef.current.contains(e.target as Node)) setVibeOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [typeOpen, vibeOpen]);

  function toggle3D() {
    if (!map) return;
    const next = !is3D;
    setIs3D(next);
    map.easeTo({ pitch: next ? DEFAULT_PITCH : 0, bearing: next ? DEFAULT_BEARING : 0, duration: 600 });
  }

  return (
    <div className="panel-elevated flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4 sm:py-3 dark:bg-neutral-900/95">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 lg:hidden dark:bg-neutral-800 dark:text-neutral-200"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      <div className="w-40 min-w-0 shrink grow sm:w-64 sm:grow-0">
        <SearchBox map={map} cafes={cafes} onSelectCafe={onSelectCafe} />
      </div>

      <div ref={typeRef} className="relative">
        <button
          onClick={() => setTypeOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          {activeCategory ? `${CATEGORY_ICONS[activeCategory]} ${CATEGORY_SHORT_LABELS[activeCategory]}` : "🗺️ All"}
        </button>

        {typeOpen && (
          <div className="panel-elevated absolute top-full left-0 z-20 mt-2 w-56 rounded-2xl bg-white p-3 dark:bg-neutral-900">
            <div className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">Cafe type</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={activeCategory === null}
                onClick={() => {
                  onSelectCategory(null);
                  setTypeOpen(false);
                }}
              >
                🗺️ All
              </Chip>
              {CATEGORY_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  active={activeCategory === option}
                  onClick={() => {
                    onSelectCategory(activeCategory === option ? null : option);
                    setTypeOpen(false);
                  }}
                >
                  {CATEGORY_ICONS[option]} {CATEGORY_SHORT_LABELS[option]}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div ref={vibeRef} className="relative">
        <button
          onClick={() => setVibeOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            activeTags.size > 0
              ? "bg-amber-500 text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5">
            <path d="M4 6h12M6 10h8M8 14h4" strokeLinecap="round" />
          </svg>
          Filters
          {activeTags.size > 0 && <span className="rounded-full bg-white/25 px-1.5">{activeTags.size}</span>}
        </button>

        {vibeOpen && (
          <div className="panel-elevated no-scrollbar absolute top-full left-0 z-20 mt-2 max-h-[70vh] w-72 max-w-[85vw] space-y-3 overflow-y-auto rounded-2xl bg-white p-3 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Drill down by vibe, price, cuisine or hours
              </div>
              {activeTags.size > 0 && (
                <button
                  onClick={() => [...activeTags].forEach((tag) => onToggleTag(tag))}
                  className="shrink-0 text-[11px] font-medium text-amber-600 hover:underline dark:text-amber-400"
                >
                  Clear
                </button>
              )}
            </div>
            {TAG_GROUPS.map((group) => (
              <div key={group.key}>
                <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.tags.map((tag) => (
                    <Chip key={tag} active={activeTags.has(tag)} onClick={() => onToggleTag(tag)}>
                      {TAG_ICONS[tag]} {tag}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden h-8 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />

      <div className="hidden items-center gap-2 sm:flex">
        <WeatherWidget pill />
        <AirQualityWidget pill />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        >
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
            </svg>
          )}
        </button>
        <button
          onClick={toggle3D}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
            is3D ? "bg-emerald-800 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
            <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
          </svg>
          <span className="hidden sm:inline">{is3D ? "3D View" : "2D View"}</span>
        </button>
        {isSignedIn ? (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white"
            title={`Signed in · +91 ${phone}`}
          >
            {phone?.slice(-2)}
          </div>
        ) : (
          <button
            onClick={() => requireAuth(() => {})}
            className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-2 text-sm font-medium whitespace-nowrap text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}
