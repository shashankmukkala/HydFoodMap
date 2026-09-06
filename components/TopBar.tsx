"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import SearchBox, { type SearchGroupMatch } from "@/components/SearchBox";
import { DEFAULT_BEARING, DEFAULT_PITCH } from "@/lib/mapStyle";
import { useAuth } from "@/lib/useAuth";
import { useRequireAuth } from "@/lib/AuthGate";
import WeatherWidget from "@/components/WeatherWidget";
import AirQualityWidget from "@/components/AirQualityWidget";
import LiveTicker from "@/components/LiveTicker";
import { CATEGORY_ICONS, CATEGORY_OPTIONS, CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import { TAG_GROUPS, TAG_ICONS, type Tag } from "@/lib/tags";
import type { Cafe, CafeEvent } from "@/lib/supabase";

type TopBarProps = {
  map: MapLibreMap | null;
  cafes: Cafe[];
  onSelectCafe: (cafe: Cafe) => void;
  onGroupMatch: (match: SearchGroupMatch) => void;
  searchClearSignal?: number;
  searchDismissDropdownSignal?: number;
  onMenuClick: () => void;
  publicMode?: boolean;
  activeCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
  activeTags: Set<Tag>;
  onToggleTag: (tag: Tag) => void;
  minRating: number;
  onSelectMinRating: (rating: number) => void;
  events?: CafeEvent[];
};

export default function TopBar({
  map,
  cafes,
  onSelectCafe,
  onGroupMatch,
  searchClearSignal,
  searchDismissDropdownSignal,
  onMenuClick,
  publicMode = false,
  activeCategory,
  onSelectCategory,
  activeTags,
  onToggleTag,
  minRating,
  onSelectMinRating,
  events = [],
}: TopBarProps) {
  const [is3D, setIs3D] = useState(true);
  const [vibeOpen, setVibeOpen] = useState(false);
  const vibeRef = useRef<HTMLDivElement>(null);
  const { isSignedIn, phone } = useAuth();
  const requireAuth = useRequireAuth();

  useEffect(() => {
    if (!vibeOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (vibeOpen && vibeRef.current && !vibeRef.current.contains(e.target as Node)) setVibeOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [vibeOpen]);

  function toggle3D() {
    if (!map) return;
    const next = !is3D;
    setIs3D(next);
    map.easeTo({ pitch: next ? DEFAULT_PITCH : 0, bearing: next ? DEFAULT_BEARING : 0, duration: 600 });
  }

  return (
    <div className="topbar-shell panel-elevated flex flex-wrap items-center gap-1.5 rounded-3xl px-2.5 py-2 sm:gap-2 sm:px-3 sm:py-2">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className={`menu-trigger flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 sm:h-8 sm:w-8 ${publicMode ? "" : "lg:hidden"} dark:bg-neutral-800 dark:text-neutral-200`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      <div className="topbar-search w-40 min-w-0 shrink grow sm:w-64 sm:grow-0">
        <SearchBox
          map={map}
          cafes={cafes}
          onSelectCafe={onSelectCafe}
          onGroupMatch={onGroupMatch}
          clearSignal={searchClearSignal}
          dismissDropdownSignal={searchDismissDropdownSignal}
        />
      </div>

      {events.length > 0 && (
        <div className="topbar-broadcast min-w-0 flex-1">
          <LiveTicker events={events} />
        </div>
      )}

      <div ref={vibeRef} className="topbar-filters relative">
        <button
          onClick={() => setVibeOpen((v) => !v)}
          className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:min-h-0 ${
            activeTags.size > 0 || minRating > 0
              ? "bg-amber-500 text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          }`}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5">
            <path d="M4 6h12M6 10h8M8 14h4" strokeLinecap="round" />
          </svg>
          Filters
          {activeCategory && <span className="hidden max-w-20 truncate sm:inline">· {CATEGORY_SHORT_LABELS[activeCategory]}</span>}
          {(activeTags.size > 0 || minRating > 0) && (
            <span className="rounded-full bg-white/25 px-1.5">{activeTags.size + (minRating > 0 ? 1 : 0)}</span>
          )}
        </button>

        {vibeOpen && (
          <div className="panel-elevated no-scrollbar absolute top-full left-0 z-20 mt-2 max-h-[70vh] w-72 max-w-[85vw] space-y-3 overflow-y-auto rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Drill down by vibe, price, cuisine or hours
              </div>
              {(activeCategory || activeTags.size > 0 || minRating > 0) && (
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    [...activeTags].forEach((tag) => onToggleTag(tag));
                    onSelectMinRating(0);
                  }}
                  className="shrink-0 text-[11px] font-medium text-amber-600 hover:underline dark:text-amber-400"
                >
                  Clear
                </button>
              )}
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">Cafe type</div>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={activeCategory === null} onClick={() => onSelectCategory(null)}>🗺️ All</Chip>
                {CATEGORY_OPTIONS.map((option) => (
                  <Chip key={option} active={activeCategory === option} onClick={() => onSelectCategory(activeCategory === option ? null : option)}>
                    {CATEGORY_ICONS[option]} {CATEGORY_SHORT_LABELS[option]}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
                Verified rating
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={minRating === 0} onClick={() => onSelectMinRating(0)}>
                  Any
                </Chip>
                {[3, 4, 4.5].map((threshold) => (
                  <Chip
                    key={threshold}
                    active={minRating === threshold}
                    onClick={() => onSelectMinRating(minRating === threshold ? 0 : threshold)}
                  >
                    ★ {threshold}+
                  </Chip>
                ))}
              </div>
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

      <div className="hidden h-6 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />

      <div className="hidden items-center gap-2 sm:flex">
        <WeatherWidget pill />
        <AirQualityWidget pill />
      </div>

      <div className="topbar-account ml-auto flex items-center gap-1.5">
        <button
          onClick={toggle3D}
          className={`flex min-h-10 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:min-h-0 ${
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
            className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white"
            title={`Signed in · +${phone}`}
          >
            {phone?.slice(-2)}
          </div>
        ) : (
          <button
            onClick={() => requireAuth(() => {})}
            className="flex min-h-10 items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white hover:bg-neutral-800 sm:min-h-0 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
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
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}
