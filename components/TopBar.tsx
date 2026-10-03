"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Map as MapLibreMap } from "maplibre-gl";
import SearchBox, { type SearchGroupMatch } from "@/components/SearchBox";
import { DEFAULT_BEARING, DEFAULT_PITCH } from "@/lib/mapStyle";
import { useAuth } from "@/lib/useAuth";
import { useProfile } from "@/lib/useProfile";
import { useRequireAuth } from "@/lib/AuthGate";
import NotificationsBell from "@/components/NotificationsBell";
import Avatar from "@/components/Avatar";
import WelcomeBonusCard from "@/components/WelcomeBonusCard";
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
  /** 0 = "Any" (no distance filter). */
  maxDistanceKm: number;
  onSelectMaxDistance: (km: number) => void;
  /** Drives the Distance chips' own inline state while a geolocation
   *  request is in flight or was denied — "idle" the rest of the time. */
  locationStatus: "idle" | "locating" | "denied";
  events?: CafeEvent[];
};

const DISTANCE_OPTIONS = [1, 3, 5, 8, 10, 15];

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
  maxDistanceKm,
  onSelectMaxDistance,
  locationStatus,
  events = [],
}: TopBarProps) {
  const [is3D, setIs3D] = useState(true);
  const [vibeOpen, setVibeOpen] = useState(false);
  const vibeRef = useRef<HTMLDivElement>(null);
  const { isSignedIn, loading: authLoading, email } = useAuth();
  const profile = useProfile();
  const requireAuth = useRequireAuth();

  useEffect(() => {
    if (!vibeOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (vibeOpen && vibeRef.current && !vibeRef.current.contains(e.target as Node)) setVibeOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [vibeOpen]);

  // Picking a single-choice filter is a finished action, so the panel gets
  // out of the way — it sits over the map, so leaving it open hid the
  // results the filter had just produced. Tags are deliberately excluded:
  // they are multi-select and people usually pick two or three, so closing
  // after each one would mean reopening the panel every time.
  function pickOne(apply: () => void) {
    apply();
    setVibeOpen(false);
  }

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
        className={`menu-trigger flex h-10 w-10 shrink-0 items-center justify-center transition-colors sm:h-8 sm:w-8 ${publicMode ? "" : "lg:hidden"}`}
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
          className={`chip min-h-10 px-3 py-1.5 text-sm sm:min-h-0 ${
            activeTags.size > 0 || minRating > 0 || maxDistanceKm > 0 ? "is-active" : ""
          }`}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5">
            <path d="M4 6h12M6 10h8M8 14h4" strokeLinecap="round" />
          </svg>
          Filters
          {activeCategory && <span className="hidden max-w-20 truncate sm:inline">· {CATEGORY_SHORT_LABELS[activeCategory]}</span>}
          {(activeTags.size > 0 || minRating > 0 || maxDistanceKm > 0) && (
            <span className="chip-count">
              {activeTags.size + (minRating > 0 ? 1 : 0) + (maxDistanceKm > 0 ? 1 : 0)}
            </span>
          )}
        </button>

        {vibeOpen && (
          <div className="panel-elevated no-scrollbar absolute top-full left-0 z-20 mt-2 max-h-[70vh] w-72 max-w-[85vw] space-y-4 overflow-y-auto rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-ink-muted">
                Drill down by vibe, price, cuisine or hours
              </div>
              {(activeCategory || activeTags.size > 0 || minRating > 0 || maxDistanceKm > 0) && (
                <button
                  onClick={() => {
                    onSelectCategory(null);
                    [...activeTags].forEach((tag) => onToggleTag(tag));
                    onSelectMinRating(0);
                    onSelectMaxDistance(0);
                    setVibeOpen(false);
                  }}
                  className="shrink-0 text-[11px] font-semibold text-brand hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold tracking-[0.16em] text-ink-muted uppercase">Cafe type</div>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={activeCategory === null} onClick={() => pickOne(() => onSelectCategory(null))}>🗺️ All</Chip>
                {CATEGORY_OPTIONS.map((option) => (
                  <Chip key={option} active={activeCategory === option} onClick={() => pickOne(() => onSelectCategory(activeCategory === option ? null : option))}>
                    {CATEGORY_ICONS[option]} {CATEGORY_SHORT_LABELS[option]}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold tracking-[0.16em] text-ink-muted uppercase">
                Verified rating
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={minRating === 0} onClick={() => pickOne(() => onSelectMinRating(0))}>
                  Any
                </Chip>
                {[3, 4, 4.5].map((threshold) => (
                  <Chip
                    key={threshold}
                    active={minRating === threshold}
                    onClick={() => pickOne(() => onSelectMinRating(minRating === threshold ? 0 : threshold))}
                  >
                    ★ {threshold}+
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em] text-ink-muted uppercase">
                Distance
                {locationStatus === "locating" && (
                  <span className="normal-case text-lamp-ink">· locating…</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip active={maxDistanceKm === 0} onClick={() => pickOne(() => onSelectMaxDistance(0))}>
                  Any
                </Chip>
                {DISTANCE_OPTIONS.map((km) => (
                  <Chip
                    key={km}
                    active={maxDistanceKm === km}
                    onClick={() => pickOne(() => onSelectMaxDistance(maxDistanceKm === km ? 0 : km))}
                  >
                    &lt;{km}km
                  </Chip>
                ))}
              </div>
              {/* Only shown right after a denial — the chips themselves
                  already communicate "pick one to filter", so a
                  permanent hint here would be redundant noise the rest
                  of the time. */}
              {locationStatus === "denied" && (
                <p className="mt-1.5 text-[11px] text-danger">
                  Couldn&apos;t get your location — check location permissions and try again.
                </p>
              )}
            </div>
            {TAG_GROUPS.map((group) => (
              <div key={group.key}>
                <div className="mb-1.5 text-[11px] font-semibold tracking-[0.16em] text-ink-muted uppercase">
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

      {/* Weather and AQI removed from the top bar, along with the divider
          that separated them from the filters. Neither changes what a
          visitor does next, and both cost a network request on every page
          load to say something a phone's own status bar and weather app
          already say. The components remain in the tree, unused, if a
          better home turns up — a cafe card, say, where "34 degrees" is
          an argument for an indoor table. */}

      <div className="topbar-account ml-auto flex items-center gap-1.5">
        <button
          onClick={toggle3D}
          className={`chip min-h-10 px-3.5 py-1.5 text-sm sm:min-h-0 ${is3D ? "is-active" : ""}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
            <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
          </svg>
          <span className="hidden sm:inline">{is3D ? "3D View" : "2D View"}</span>
        </button>
        {/* Google sign-in is for public visitors leaving reviews/
            bookmarks under their own identity — admin is a single
            trusted operator, not someone who needs (or should be
            prompted) to sign in with a Google account. */}
        {publicMode && !authLoading && isSignedIn && <WelcomeBonusCard />}
        {publicMode && !authLoading && isSignedIn && <NotificationsBell />}
        {publicMode &&
          (authLoading ? (
            // Checking for an existing session takes a moment even for a
            // returning signed-in visitor — isSignedIn reads false until
            // that resolves, so rendering off it directly flashed "Sign
            // up" on every single load/reload before flipping to the
            // avatar a beat later. This skeleton (same footprint as the
            // avatar, so nothing jumps once the real state lands) covers
            // that gap instead of showing either wrong state.
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-ink/5" aria-hidden="true" />
          ) : isSignedIn ? (
            <Link href="/profile" title={profile?.display_name ?? email ?? "Your profile"} className="shrink-0">
              <Avatar
                avatarUrl={profile?.avatar_url ?? null}
                label={profile?.display_name ?? email ?? "?"}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white"
              />
            </Link>
          ) : (
            <button
              onClick={() => requireAuth(() => {})}
              className="chip chip-solid min-h-10 px-3 py-1.5 text-sm sm:min-h-0"
            >
              Sign up
            </button>
          ))}
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
      className={`chip gap-1 px-2.5 py-1 text-xs ${active ? "is-active" : ""}`}
    >
      {children}
    </button>
  );
}
