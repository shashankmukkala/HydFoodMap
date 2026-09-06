"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import MapView from "@/components/Map";
import CafeMarkers from "@/components/CafeMarkers";
import PendingMarker from "@/components/PendingMarker";
import BillboardLayer from "@/components/BillboardLayer";
import BillboardMarkers from "@/components/BillboardMarkers";
import AircraftAdOverlay from "@/components/AircraftAdOverlay";
import ModelLayer from "@/components/ModelLayer";
import PlaceCafeForm from "@/components/PlaceCafeForm";
import PlaceBillboardForm from "@/components/PlaceBillboardForm";
import PlaceRailAdForm from "@/components/PlaceRailAdForm";
import PlaceEventForm from "@/components/PlaceEventForm";
import TopBar from "@/components/TopBar";
import SearchResultsPanel from "@/components/SearchResultsPanel";
import type { SearchGroupMatch } from "@/components/SearchBox";
import OnboardingBanner from "@/components/OnboardingBanner";
import Sidebar, { type FeedTab } from "@/components/Sidebar";
import FeedPanel from "@/components/FeedPanel";
import EventsPanel from "@/components/EventsPanel";
import DetailCard from "@/components/DetailCard";
import MapAttribution from "@/components/MapAttribution";
import CollectionsPanel from "@/components/CollectionsPanel";
import AdRail from "@/components/AdRail";
import AdEnquiriesPanel, { type AdEnquiry } from "@/components/AdEnquiriesPanel";
import { useBookmarks } from "@/lib/useBookmarks";
import { useVisitTracking } from "@/lib/useVisitTracking";
import { useCollections } from "@/lib/useCollections";
import { useRequireAuth } from "@/lib/AuthGate";
import { TAG_ICONS, type Tag } from "@/lib/tags";
import { BACKGROUND_GRADIENTS, CATEGORY_ICONS, CATEGORY_OPTIONS, CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import type { Billboard, Cafe, CafeEvent } from "@/lib/supabase";
import type { CafeRating } from "@/app/api/cafes/ratings/route";

type PlacingMode = "cafe" | "billboard" | "aircraft" | "rail" | null;
type Selected = { kind: "cafe"; item: Cafe } | { kind: "billboard"; item: Billboard } | null;

type MapExperienceProps = {
  /**
   * Public visitors browse only — no way to pin a cafe or place a billboard.
   * Only the admin build of this experience (app/admin) can create either;
   * both still read/write the same Supabase tables, so anything added in
   * admin shows up here immediately, and vice versa.
   */
  isAdmin: boolean;
};

export default function MapExperience({ isAdmin }: MapExperienceProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [events, setEvents] = useState<CafeEvent[]>([]);
  const [placingMode, setPlacingMode] = useState<PlacingMode>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [adEnquiries, setAdEnquiries] = useState<AdEnquiry[]>([]);
  const [feedTab, setFeedTab] = useState<FeedTab>(null);
  const [activeTags, setActiveTags] = useState<Set<Tag>>(new Set());
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [ratings, setRatings] = useState<Record<string, CafeRating>>({});
  const [selected, setSelected] = useState<Selected>(null);
  const [searchMatch, setSearchMatch] = useState<SearchGroupMatch>(null);
  const [searchClearSignal, setSearchClearSignal] = useState(0);
  const [searchDismissDropdownSignal, setSearchDismissDropdownSignal] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [resultsPageSize, setResultsPageSize] = useState(5);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const { bookmarkedIds } = useBookmarks();
  const { visitedCount, visitedIds } = useVisitTracking();
  const { collections, createCollection, deleteCollection } = useCollections();
  const requireAuth = useRequireAuth();

  useEffect(() => {
    fetch("/api/cafes")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setCafes(data))
      .catch(() => {});
    fetch("/api/billboards")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setBillboards(data))
      .catch(() => {});
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setEvents(data))
      .catch(() => {});
    fetch("/api/cafes/ratings")
      .then((res) => res.json())
      .then((data) => data && typeof data === "object" && setRatings(data))
      .catch(() => {});
    if (isAdmin) {
      fetch("/api/ad-enquiries")
        .then((res) => res.json())
        .then((data) => Array.isArray(data) && setAdEnquiries(data))
        .catch(() => {});
    }
  }, [isAdmin]);

  // Tags and rating narrow meaningfully alongside a search (a manually
  // picked "Quiet" tag chip plus a typed area both make sense together),
  // but Category deliberately doesn't pre-filter this — a cafe has
  // exactly one category, so if the search text names a *different* one
  // than whatever's manually selected in the Type chip, handing search a
  // list already narrowed to the old category would make the new one
  // unmatchable (see the category-conflict note in lib/searchMatch.ts).
  // `activeCategory` below is what actually gets applied — handleGroupMatch
  // reconciles the two into that single value on every new search match.
  const categoryAgnosticCafes = useMemo(() => {
    let result = cafes;
    if (activeTags.size > 0) {
      result = result.filter((c) => [...activeTags].every((tag) => c.tags.includes(tag)));
    }
    if (minRating > 0) {
      result = result.filter((c) => (ratings[c.id]?.avg ?? 0) >= minRating);
    }
    return result;
  }, [cafes, activeTags, minRating, ratings]);

  // Category always reads from activeCategory, the single source of
  // truth — handleGroupMatch below sets it (in the same batched update
  // as setSearchMatch) the moment a search match names a category, so by
  // the time this renders it's already correct with no separate "search
  // wins" fallback needed. That fallback used to exist here, reading
  // straight from searchMatch.category — which meant the search's
  // category kept winning forever (as long as the query text didn't
  // change) even after manually picking a *different* Type chip
  // afterward, since searchMatch.category doesn't change just because
  // activeCategory did. Manually picking Bar after a "best cafe" search
  // left the map/list stuck on Cafe with only the button's own highlight
  // updating — this is that bug.
  const visibleCafes = useMemo(() => {
    if (!activeCategory) return categoryAgnosticCafes;
    return categoryAgnosticCafes.filter((c) => c.category === activeCategory);
  }, [categoryAgnosticCafes, activeCategory]);

  // What the map (and the results panel) shows — search and the manual
  // Type/Filters controls COMBINE (AND) instead of one clearing the
  // other: a manually picked tag/rating filter plus a typed area both
  // narrow the same list, and a category named in the search text
  // reconciles with (replaces, if different) the manual Type selection
  // above rather than being ANDed into an impossible combination.
  const displayedCafes = searchMatch
    ? activeCategory
      ? searchMatch.cafes.filter((c) => c.category === activeCategory)
      : searchMatch.cafes
    : visibleCafes;

  // The results panel shows whenever ANY criterion — manual filter or
  // search — is active, combining both into one label (e.g. "☕ Cafe ·
  // 📍 Sainikpuri" when "Cafe" came from the Type dropdown and
  // "Sainikpuri" came from typing). Category appears at most once even
  // though it can come from either source, since activeCategory is the
  // single reconciled value.
  const resultsMatch: SearchGroupMatch = (() => {
    const parts: string[] = [];
    if (activeCategory) parts.push(`${CATEGORY_ICONS[activeCategory]} ${CATEGORY_SHORT_LABELS[activeCategory]}`);
    for (const tag of activeTags) parts.push(`${TAG_ICONS[tag]} ${tag}`);
    if (minRating > 0) parts.push(`★ ${minRating}+`);
    if (searchMatch?.label) parts.push(searchMatch.label);
    if (parts.length === 0) return null;
    return { label: parts.join(" · "), cafes: displayedCafes };
  })();

  // Events ("Happening in Hyderabad") is filler, not real content — it
  // exists to keep the right column from ever showing just one lonely
  // panel. So it shows only when fewer than two "real" panels (the
  // selected cafe's DetailCard, a search/filter results list, and a
  // sidebar tab like Favourites) are already on screen, and steps aside
  // the moment two of those are — never a third panel piling on top, but
  // never left alone with nothing beside it either.
  const realPanelCount = (selected ? 1 : 0) + (resultsMatch ? 1 : 0) + (feedTab ? 1 : 0);
  const showEvents = realPanelCount < 2;
  const upcomingEventCount = events.filter((event) => event.event_date >= new Date().toISOString().slice(0, 10)).length;

  // The results list's carousel page normally shows 5 rows, but that's
  // only guaranteed to fit when it's the only panel in the column. Once
  // DetailCard or a sidebar tab is stacked above/below it (or the window
  // is just short), 5 rows can push the column past the viewport and
  // force a scrollbar — so shrink the page size until the column's own
  // content fits inside it. `panelShapeKey` resets back to 5 whenever
  // what's on screen changes (a new combination might fit more, not
  // less), and the effect below shrinks it again from there if it still
  // doesn't fit — this is what avoids getting stuck permanently shrunk.
  const panelShapeKey = `${!!selected}-${!!feedTab}-${resultsMatch ? resultsMatch.cafes.length : 0}-${showEvents}`;
  // Reset adjusted during render (React's recommended pattern for "state
  // driven by a prop/derived value" — see
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  // rather than in an effect, which would apply the reset a frame late.
  const [lastPanelShapeKey, setLastPanelShapeKey] = useState(panelShapeKey);
  if (panelShapeKey !== lastPanelShapeKey) {
    setLastPanelShapeKey(panelShapeKey);
    setResultsPageSize(5);
  }

  // useLayoutEffect (not useEffect) so this measures and corrects before
  // the browser paints — a passive effect would let the overflowing
  // 5-rows layout flash on screen for a frame first. Floor of 1 (not 2)
  // so it keeps shrinking as far as it takes to actually eliminate the
  // scrollbar; a single-row page is still a usable carousel.
  useLayoutEffect(() => {
    if (!resultsMatch) return;
    const el = rightColumnRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight + 1 && resultsPageSize > 1) {
      setResultsPageSize((n) => Math.max(1, n - 1));
    }
    // Re-measures after every shrink step (resultsPageSize) and whenever
    // the panel combination changes shape; deliberately not on every
    // window resize event — the ResizeObserver below handles that by
    // resetting panelShapeKey's effect to try 5 again from scratch.
  }, [resultsPageSize, panelShapeKey, resultsMatch]);

  useEffect(() => {
    const el = rightColumnRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // Observes the column's own (CSS-bounded) box size, not its content —
    // growing/shrinking scrollHeight from adding rows doesn't fire this,
    // only an actual viewport/layout resize does, so this can't loop with
    // the shrink effect above.
    const ro = new ResizeObserver(() => setResultsPageSize(5));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The results panel's own X button clears everything that produced it —
  // the typed search AND the Type/Tag/Rating chips — so it always
  // actually closes. A partial clear (search only, leaving a manual
  // filter active) used to leave the panel on screen relabeled instead of
  // dismissed, which read as "the close button doesn't work." The query
  // text is cleared too (via searchClearSignal) so a stale query can't
  // silently re-match a moment later and reopen the panel just closed.
  // Also used by "Explore Map", an equivalent full start-over action.
  function clearAllFilters() {
    setSearchMatch(null);
    setActiveCategory(null);
    setActiveTags(new Set());
    setMinRating(0);
    setSearchClearSignal((n) => n + 1);
  }

  // Manually touching Type/Filters while a search is active — e.g.
  // typing "best cafe", then clicking the Bar chip — now correctly
  // updates the results (see the activeCategory-as-source-of-truth fix
  // above), but the search box still showed the old "best cafe" text
  // sitting there describing results that no longer match it. Clearing
  // the search here (same searchClearSignal mechanism the results
  // panel's own close button uses) keeps the two from visibly
  // disagreeing. Only fires when a search is actually active — plain
  // Type/Filters use with no search typed shouldn't touch the (already
  // empty) search box.
  function clearSearchIfActive() {
    if (!searchMatch) return;
    setSearchMatch(null);
    setSearchClearSignal((n) => n + 1);
  }

  // Shared by the filter-change effect below and by search group-matches
  // (typing a vibe/type/area) — zooms/pans to fit a set of cafes with
  // generous padding, so the fit reads as "zoomed out a bit to see the
  // area," not a tight crop right up against the matched pins.
  function fitMapToCafes(target: Cafe[]) {
    if (!map || target.length === 0) return;
    const lngs = target.map((c) => c.lng);
    const lats = target.map((c) => c.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 120, maxZoom: 15, duration: 700 }
    );
  }

  // Zooms/pans to fit whatever the current filters match, so switching
  // "Type" or a vibe/rating filter shows *where* those cafes actually
  // cluster instead of leaving the view wherever it happened to be.
  // Skipped on the very first render (didFitOnFilterChange starts false)
  // — the map already opens on Jubilee Hills deliberately (see
  // DEFAULT_MAP_CENTER in lib/mapStyle.ts), and cafes loading in for the
  // first time isn't a filter change.
  const didFitOnFilterChange = useRef(false);
  useEffect(() => {
    if (!didFitOnFilterChange.current) {
      didFitOnFilterChange.current = true;
      return;
    }
    fitMapToCafes(visibleCafes);
    // visibleCafes deliberately excluded — this should react to the filter
    // controls changing, not to every recompute of the filtered list (e.g.
    // cafes/ratings loading in).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, activeCategory, activeTags, minRating]);

  // A vibe/type/area search match (see SearchBox's onGroupMatch, and the
  // combining note on displayedCafes above) opens a results card and fits
  // the map to those cafes, the same way selecting a filter does — typing
  // "quiet" should behave like tapping the Quiet filter chip. A category
  // named in the text (e.g. "cafes" in "best cafes in hyderabad")
  // replaces a conflicting manual Type selection instead of being ANDed
  // into it — see the category-conflict note on categoryAgnosticCafes
  // above. Deliberately no "best/top-rated" handling: the only rating
  // data available client-side is either the internal-only source rating
  // (never used for user-facing behavior, by design) or the verified
  // review-average rating, which starts empty for every cafe until real
  // reviews come in — auto-filtering on it just produced a confusing
  // "0 matches" for a query that looked reasonable.
  function handleGroupMatch(match: SearchGroupMatch) {
    setSearchMatch(match);
    if (!match) return;

    const nextCategory = match.category ?? activeCategory;
    if (match.category && match.category !== activeCategory) setActiveCategory(match.category);

    // Fit using the fully reconciled list, computed synchronously here —
    // the setActiveCategory call above won't be reflected in
    // `visibleCafes` until the next render, but the map should still fly
    // to the right pins on this one.
    let target = match.cafes;
    if (nextCategory) target = target.filter((c) => c.category === nextCategory);
    fitMapToCafes(target);
  }

  const savedCafes = useMemo(
    () => cafes.filter((c) => bookmarkedIds.includes(c.id)),
    [cafes, bookmarkedIds]
  );

  const visitedCafes = useMemo(
    () => cafes.filter((c) => visitedIds.includes(c.id)),
    [cafes, visitedIds]
  );

  function handleMapClick(lngLat: { lng: number; lat: number }) {
    if (!isAdmin || !placingMode || placingMode === "aircraft") return;
    setPendingCoords(lngLat);
  }

  function cancelPlacement() {
    setPendingCoords(null);
    setPlacingMode(null);
  }

  function toggleMode(mode: PlacingMode) {
    if (!isAdmin) return;
    setPlacingMode((current) => (current === mode ? null : mode));
    setPendingCoords(null);
    setSelected(null);
  }

  function toggleTag(tag: Tag) {
    clearSearchIfActive();
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function selectCategoryManually(category: Category | null) {
    clearSearchIfActive();
    setActiveCategory(category);
  }

  function selectMinRatingManually(rating: number) {
    clearSearchIfActive();
    setMinRating(rating);
  }

  function selectCafe(cafe: Cafe) {
    // Picking a cafe from anywhere but the search box's own dropdown
    // (a SearchResultsPanel row, a map marker, Favourites, ...) should
    // still close that dropdown if it happened to be open — its geocoded
    // address suggestion has nothing to do with the cafe just picked, and
    // was otherwise left sitting open under the search bar with no way
    // for the user to dismiss it (see SearchBox's dismissDropdownSignal).
    setSearchDismissDropdownSignal((n) => n + 1);
    if (selected?.kind === "cafe" && selected.item.id === cafe.id) {
      setSelected(null);
      return;
    }
    setSelected({ kind: "cafe", item: cafe });
    map?.flyTo({ center: [cafe.lng, cafe.lat], zoom: Math.max(map.getZoom(), 16), essential: true });
  }

  // Clicking a pin straight on the map isn't "browsing" whatever sidebar
  // tab happens to be open (Favourites/Visited/Collections) — that tab's
  // list has nothing to do with the pin you just clicked, so leaving it
  // up produces an irrelevant, often-empty panel stacked under the
  // DetailCard (e.g. clicking a random cafe while "Visited" — empty — is
  // open). Picking a cafe *from within* one of those lists keeps it open
  // (see the plain selectCafe passed to FeedPanel/CollectionsPanel below)
  // since you're likely browsing several; only a direct map click clears
  // it. The search-results list is left alone either way — an active
  // search is still relevant context for whatever's visible on the map.
  function selectCafeFromMap(cafe: Cafe) {
    setFeedTab(null);
    selectCafe(cafe);
  }

  function selectBillboard(billboard: Billboard) {
    if (selected?.kind === "billboard" && selected.item.id === billboard.id) {
      setSelected(null);
      return;
    }
    setSelected({ kind: "billboard", item: billboard });
    if (billboard.ad_type !== "rail") {
      map?.flyTo({
        center: [billboard.lng, billboard.lat],
        zoom: Math.max(map.getZoom(), 16),
        essential: true,
      });
    }
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await fetch(`/api/events/${id}`, { method: "DELETE" });
    } catch {
      // best-effort — event stays removed from view even if the request fails
    }
  }

  function startAircraftPlacement() {
    if (!isAdmin || !map) return;
    const center = map.getCenter();
    setPlacingMode("aircraft");
    setPendingCoords({ lng: center.lng, lat: center.lat });
    setSelected(null);
    setFeedTab(null);
  }

  async function deleteBillboard(id: string) {
    setBillboards((prev) => prev.filter((billboard) => billboard.id !== id));
    if (selected?.kind === "billboard" && selected.item.id === id) setSelected(null);
    try {
      await fetch(`/api/billboards/${id}`, { method: "DELETE" });
    } catch {
      // Keep the placement removed from the current view if the request fails.
    }
  }

  function handleExplore() {
    setFeedTab(null);
    setSelected(null);
    clearAllFilters();
    setPlacingMode(null);
    setPendingCoords(null);
  }

  function handleSelectTab(tab: FeedTab) {
    setFeedTab(tab);
    setSelected(null);
  }

  async function updateAdEnquiry(id: string, status: "approved" | "rejected") {
    const response = await fetch(`/api/ad-enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    setAdEnquiries((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  const bgKey: Category | "all" = activeCategory ?? "all";

  return (
    <div className={`map-experience-shell relative isolate flex h-dvh w-dvw gap-1 overflow-hidden p-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] sm:gap-1.5 sm:p-2 ${isAdmin ? "is-admin" : "is-public"}`}>
      {/* The aurora backdrop lives on this fixed base layer's own
          background (not a separately z-indexed overlay child) — a
          negative-z-index element only stays contained "behind its own
          siblings" if some ancestor actually establishes a stacking
          context; plain `relative` with no z-index doesn't, so the
          negative-z child was escaping to the document root's stacking
          context and painting *underneath* the page's own background,
          which is why nothing showed. `isolate` on the root forces that
          stacking context explicitly instead of relying on it happening
          to work. One base layer + one crossfading overlay (opacity only,
          so the base is never see-through) keeps the "type" filter's
          smooth transition. */}
      <div className={`absolute inset-0 -z-10 ${BACKGROUND_GRADIENTS.all}`}>
        {CATEGORY_OPTIONS.map((key) => (
          <div
            key={key}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${BACKGROUND_GRADIENTS[key]} ${
              bgKey === key ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>

      <div className="map-sidebar-rail">
      <Sidebar
        activeTab={feedTab}
        onSelectTab={handleSelectTab}
        onExplore={handleExplore}
        showBillboards={isAdmin}
        publicMode={!isAdmin}
        onPlaceCafe={() => toggleMode("cafe")}
        onPlaceBillboard={() => toggleMode("billboard")}
        onPlaceAircraft={startAircraftPlacement}
        onPlaceRail={() => toggleMode("rail")}
        visitedCount={visitedCount}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      </div>

      <div className="map-main-shell min-h-0 flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto sm:gap-3 lg:overflow-hidden">
        {isAdmin && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center pt-2">
            <div className="rounded-full bg-neutral-900 px-4 py-1 text-xs font-medium tracking-wide text-white uppercase">
              Admin mode
            </div>
          </div>
        )}

        <div className="relative z-20">
          <TopBar
            map={map}
            // Handed the tags/rating-filtered list but NOT category-
            // filtered (see categoryAgnosticCafes above) — a category the
            // search text detects reconciles with the manual Type
            // selection in handleGroupMatch rather than being searched
            // for within an already differently-categorized list, which
            // could only ever find zero matches.
            cafes={categoryAgnosticCafes}
            onSelectCafe={selectCafe}
            onGroupMatch={handleGroupMatch}
            searchClearSignal={searchClearSignal}
            searchDismissDropdownSignal={searchDismissDropdownSignal}
            onMenuClick={() => setMobileNavOpen(true)}
            publicMode={!isAdmin}
            activeCategory={activeCategory}
            onSelectCategory={selectCategoryManually}
            activeTags={activeTags}
            onToggleTag={toggleTag}
            minRating={minRating}
            onSelectMinRating={selectMinRatingManually}
            events={events}
          />
        </div>

        <OnboardingBanner />

        {!isAdmin && (
          <button
            type="button"
            className="news-launcher"
            aria-expanded={eventsOpen}
            onClick={() => setEventsOpen((open) => !open)}
          >
            <span className="news-launcher-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 17h16M6 17V9l6-4 6 4v8M9 17v-5h6v5" />
              </svg>
            </span>
            <span>News</span>
            <span className="news-launcher-count">{upcomingEventCount.toString().padStart(2, "0")}</span>
          </button>
        )}

        <div className="map-content-layer relative z-10 flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-2 lg:flex-row">
          <div className="map-canvas-shell relative h-[min(56dvh,34rem)] min-h-[18rem] min-w-0 shrink-0 overflow-hidden rounded-3xl shadow-xl sm:h-[50vh] lg:h-auto lg:flex-1">
            <MapView placingMode={placingMode} onMapClick={handleMapClick} onMapReady={setMap} showRotationControls />
            <CafeMarkers
              map={map}
              cafes={displayedCafes}
              selectedId={selected?.kind === "cafe" ? selected.item.id : null}
              onSelect={selectCafeFromMap}
            />
            <BillboardMarkers
              map={map}
              billboards={billboards}
              selectedId={selected?.kind === "billboard" ? selected.item.id : null}
              onSelect={selectBillboard}
            />
            <AircraftAdOverlay
              billboards={billboards}
              selectedId={selected?.kind === "billboard" ? selected.item.id : null}
              onSelect={selectBillboard}
            />
            <BillboardLayer map={map} billboards={billboards} />
            <ModelLayer map={map} />
            {isAdmin && placingMode !== "aircraft" && <PendingMarker map={map} coords={pendingCoords} onDragEnd={setPendingCoords} />}

            <div className="panel-elevated pointer-events-none absolute top-4 left-4 z-10 rounded-full px-3.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
              Showing {displayedCafes.length} spot{displayedCafes.length === 1 ? "" : "s"}
            </div>

            <MapAttribution />

            {!isAdmin && <AdRail billboards={billboards} onSelect={selectBillboard} />}


            {placingMode && !pendingCoords && (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
                <div className="rounded-full bg-neutral-900/90 px-4 py-2 text-sm text-white shadow-lg">
                  Click anywhere on the map to{" "}
                  {placingMode === "cafe" ? "pin a cafe" : "place a billboard"}
                </div>
              </div>
            )}
          </div>

          <div ref={rightColumnRef} className="map-panels-column flex w-full min-w-0 flex-col gap-1.5 sm:gap-2 lg:w-96 lg:shrink-0 lg:overflow-y-auto">
            {isAdmin && pendingCoords && placingMode === "cafe" && (
              <PlaceCafeForm
                coords={pendingCoords}
                onCancel={cancelPlacement}
                onCreated={(cafe) => {
                  setCafes((prev) => [cafe, ...prev]);
                  cancelPlacement();
                }}
              />
            )}

            {isAdmin && placingMode === "rail" && (
              <PlaceRailAdForm
                existing={billboards}
                onCancel={cancelPlacement}
                onCreated={(billboard) => {
                  setBillboards((prev) => [billboard, ...prev]);
                  cancelPlacement();
                }}
              />
            )}

            {isAdmin && pendingCoords && (placingMode === "billboard" || placingMode === "aircraft") && (
              <PlaceBillboardForm
                coords={pendingCoords}
                initialAdType={placingMode === "aircraft" ? "aircraft" : "billboard"}
                onCancel={cancelPlacement}
                onCreated={(billboard) => {
                  setBillboards((prev) => [billboard, ...prev]);
                  cancelPlacement();
                }}
              />
            )}

            {/* DetailCard layers ON TOP of whatever list you opened it
                from — clicking a cafe in Favourites or in search results
                shouldn't replace that list, since you're likely picking
                through several of them. */}
            {selected &&
              (selected.kind === "cafe" ? (
                <DetailCard kind="cafe" item={selected.item} onClose={() => setSelected(null)} />
              ) : (
                <DetailCard kind="billboard" item={selected.item} onClose={() => setSelected(null)} />
              ))}

            {/* Every real panel below is independent — Sidebar tabs
                (Favourites/Visited/Collections), a search/filter list,
                and DetailCard above all stack together rather than one
                replacing another. Events fills in only up to a max of
                two real panels on screen (see showEvents/realPanelCount
                above) — it's the last one added and the first one
                dropped. */}
            {isAdmin && feedTab === "billboards" && (
              <FeedPanel
                kind="billboard"
                title="Billboards"
                icon="📢"
                emptyLabel="No billboards yet."
                items={billboards}
                onSelect={selectBillboard}
                onDelete={deleteBillboard}
                onClose={() => setFeedTab(null)}
              />
            )}
            {feedTab === "saved" && (
              <FeedPanel
                kind="cafe"
                title="Favourites"
                icon="🔖"
                emptyLabel="Tap the bookmark icon on a cafe to save it here."
                items={savedCafes}
                onSelect={selectCafe}
                onClose={() => setFeedTab(null)}
              />
            )}
            {feedTab === "visited" && (
              <FeedPanel
                kind="cafe"
                title="Visited"
                icon="🚶"
                emptyLabel="Mark a cafe as visited to see it here."
                items={visitedCafes}
                onSelect={selectCafe}
                onClose={() => setFeedTab(null)}
              />
            )}
            {feedTab === "collections" && (
              <CollectionsPanel
                collections={collections}
                cafes={cafes}
                onSelectCafe={selectCafe}
                onCreate={(name) => requireAuth(() => createCollection(name))}
                onDelete={(id) => requireAuth(() => deleteCollection(id))}
                onClose={() => setFeedTab(null)}
              />
            )}

            {resultsMatch && (
              <SearchResultsPanel
                label={resultsMatch.label}
                cafes={resultsMatch.cafes}
                onSelect={selectCafe}
                onClose={clearAllFilters}
                pageSize={resultsPageSize}
              />
            )}

            {showEvents && (isAdmin || eventsOpen) && (
              <EventsPanel
                events={events}
                isAdmin={isAdmin}
                onAddClick={() => setEventFormOpen(true)}
                onDelete={deleteEvent}
                onClose={!isAdmin ? () => setEventsOpen(false) : undefined}
              />
            )}
            {isAdmin && feedTab === "ad-enquiries" && (
              <AdEnquiriesPanel enquiries={adEnquiries} onStatus={updateAdEnquiry} onClose={() => setFeedTab(null)} />
            )}
          </div>
        </div>
      </div>

      {isAdmin && eventFormOpen && (
        <PlaceEventForm
          onCancel={() => setEventFormOpen(false)}
          onCreated={(event) => {
            setEvents((prev) => [...prev, event].sort((a, b) => a.event_date.localeCompare(b.event_date)));
            setEventFormOpen(false);
          }}
        />
      )}
    </div>
  );
}
