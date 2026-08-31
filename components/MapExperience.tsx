"use client";

import { useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import MapView from "@/components/Map";
import CafeMarkers from "@/components/CafeMarkers";
import BillboardLayer from "@/components/BillboardLayer";
import ModelLayer from "@/components/ModelLayer";
import PlaceCafeForm from "@/components/PlaceCafeForm";
import PlaceBillboardForm from "@/components/PlaceBillboardForm";
import PlaceEventForm from "@/components/PlaceEventForm";
import TopBar from "@/components/TopBar";
import Sidebar, { type FeedTab } from "@/components/Sidebar";
import FeedPanel from "@/components/FeedPanel";
import EventsPanel from "@/components/EventsPanel";
import DetailCard from "@/components/DetailCard";
import FloatingActions from "@/components/FloatingActions";
import MapAttribution from "@/components/MapAttribution";
import CollectionsPanel from "@/components/CollectionsPanel";
import { useBookmarks } from "@/lib/useBookmarks";
import { useVisitTracking } from "@/lib/useVisitTracking";
import { useCollections } from "@/lib/useCollections";
import { useRequireAuth } from "@/lib/AuthGate";
import type { Tag } from "@/lib/tags";
import type { Category } from "@/lib/categories";
import type { Billboard, Cafe, CafeEvent } from "@/lib/supabase";

type PlacingMode = "cafe" | "billboard" | null;
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
  const [feedTab, setFeedTab] = useState<FeedTab>(null);
  const [activeTags, setActiveTags] = useState<Set<Tag>>(new Set());
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  }, []);

  const visibleCafes = useMemo(() => {
    let result = cafes;
    if (activeCategory) result = result.filter((c) => c.category === activeCategory);
    if (activeTags.size > 0) {
      result = result.filter((c) => [...activeTags].every((tag) => c.tags.includes(tag)));
    }
    return result;
  }, [cafes, activeTags, activeCategory]);

  const savedCafes = useMemo(
    () => cafes.filter((c) => bookmarkedIds.includes(c.id)),
    [cafes, bookmarkedIds]
  );

  const visitedCafes = useMemo(
    () => cafes.filter((c) => visitedIds.includes(c.id)),
    [cafes, visitedIds]
  );

  function handleMapClick(lngLat: { lng: number; lat: number }) {
    if (!isAdmin || !placingMode) return;
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
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function selectCafe(cafe: Cafe) {
    if (selected?.kind === "cafe" && selected.item.id === cafe.id) {
      setSelected(null);
      return;
    }
    setSelected({ kind: "cafe", item: cafe });
    map?.flyTo({ center: [cafe.lng, cafe.lat], zoom: Math.max(map.getZoom(), 16), essential: true });
  }

  function selectBillboard(billboard: Billboard) {
    if (selected?.kind === "billboard" && selected.item.id === billboard.id) {
      setSelected(null);
      return;
    }
    setSelected({ kind: "billboard", item: billboard });
    map?.flyTo({
      center: [billboard.lng, billboard.lat],
      zoom: Math.max(map.getZoom(), 16),
      essential: true,
    });
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await fetch(`/api/events/${id}`, { method: "DELETE" });
    } catch {
      // best-effort — event stays removed from view even if the request fails
    }
  }

  function handleExplore() {
    setFeedTab(null);
    setSelected(null);
    setPlacingMode(null);
    setPendingCoords(null);
  }

  function handleSelectTab(tab: FeedTab) {
    setFeedTab(tab);
    setSelected(null);
  }

  return (
    <div className="relative flex h-dvh w-dvw gap-2 overflow-hidden bg-neutral-100 p-2 sm:gap-3 sm:p-4 dark:bg-neutral-950">
      <Sidebar
        activeTab={feedTab}
        onSelectTab={handleSelectTab}
        onExplore={handleExplore}
        showBillboards={isAdmin}
        visitedCount={visitedCount}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto sm:gap-3 lg:overflow-hidden">
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
            cafes={cafes}
            onSelectCafe={selectCafe}
            onMenuClick={() => setMobileNavOpen(true)}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            activeTags={activeTags}
            onToggleTag={toggleTag}
          />
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-2 sm:gap-3 lg:flex-row">
          <div className="relative h-[50vh] min-w-0 shrink-0 overflow-hidden rounded-2xl shadow-xl lg:h-auto lg:flex-1">
            <MapView placingMode={placingMode} onMapClick={handleMapClick} onMapReady={setMap} />
            <CafeMarkers
              map={map}
              cafes={visibleCafes}
              selectedId={selected?.kind === "cafe" ? selected.item.id : null}
              onSelect={selectCafe}
            />
            <BillboardLayer map={map} billboards={billboards} />
            <ModelLayer map={map} />

            <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-medium text-neutral-700 shadow-lg backdrop-blur dark:bg-neutral-900/95 dark:text-neutral-200">
              Showing {visibleCafes.length} spot{visibleCafes.length === 1 ? "" : "s"}
            </div>

            <MapAttribution />

            {isAdmin && (
              <div className="pointer-events-auto absolute right-4 bottom-36 z-10">
                <FloatingActions placingMode={placingMode} onToggleMode={toggleMode} />
              </div>
            )}

            {placingMode && !pendingCoords && (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
                <div className="rounded-full bg-neutral-900/90 px-4 py-2 text-sm text-white shadow-lg">
                  Click anywhere on the map to{" "}
                  {placingMode === "cafe" ? "pin a cafe" : "place a billboard"}
                </div>
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:gap-3 lg:w-96 lg:shrink-0 lg:overflow-y-auto">
            {selected &&
              (selected.kind === "cafe" ? (
                <DetailCard kind="cafe" item={selected.item} onClose={() => setSelected(null)} />
              ) : (
                <DetailCard kind="billboard" item={selected.item} onClose={() => setSelected(null)} />
              ))}

            {isAdmin && feedTab === "billboards" && (
              <FeedPanel
                kind="billboard"
                title="Billboards"
                icon="📢"
                emptyLabel="No billboards yet."
                items={billboards}
                onSelect={selectBillboard}
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

            {/* Always present — slides below whatever's selected/browsed above it. */}
            <EventsPanel
              events={events}
              isAdmin={isAdmin}
              onAddClick={() => setEventFormOpen(true)}
              onDelete={deleteEvent}
            />
          </div>
        </div>
      </div>

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

      {isAdmin && pendingCoords && placingMode === "billboard" && (
        <PlaceBillboardForm
          coords={pendingCoords}
          onCancel={cancelPlacement}
          onCreated={(billboard) => {
            setBillboards((prev) => [billboard, ...prev]);
            cancelPlacement();
          }}
        />
      )}

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
