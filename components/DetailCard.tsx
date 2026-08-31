"use client";

import { useEffect, useRef, useState } from "react";
import type { Billboard, Cafe } from "@/lib/supabase";
import { useBookmarks } from "@/lib/useBookmarks";
import { useCollections } from "@/lib/useCollections";
import { useVisitTracking } from "@/lib/useVisitTracking";
import { useRequireAuth } from "@/lib/AuthGate";
import { CATEGORY_ICONS, CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import ReviewsSection from "@/components/ReviewsSection";

function cafeIcon(cafe: Cafe) {
  if (cafe.category && cafe.category in CATEGORY_ICONS) return CATEGORY_ICONS[cafe.category as Category];
  return "☕";
}

type DetailCardProps =
  | { kind: "cafe"; item: Cafe; onClose: () => void }
  | { kind: "billboard"; item: Billboard; onClose: () => void };

export default function DetailCard({ kind, item, onClose }: DetailCardProps) {
  const isCafe = kind === "cafe";
  const cafe = isCafe ? (item as Cafe) : null;
  const billboard = !isCafe ? (item as Billboard) : null;
  const { isBookmarked, toggle } = useBookmarks();
  const { collections, createCollection, addCafeToCollection, removeCafeFromCollection } = useCollections();
  const { isVisited, setVisited } = useVisitTracking();
  const requireAuth = useRequireAuth();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const collectionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collectionsOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (collectionsRef.current && !collectionsRef.current.contains(e.target as Node)) {
        setCollectionsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [collectionsOpen]);

  const bookmarked = isCafe && isBookmarked(item.id);
  const inCollectionCount = isCafe
    ? collections.filter((c) => c.cafeIds.includes(item.id)).length
    : 0;

  function submitNewCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!newCollectionName.trim() || !isCafe) return;
    requireAuth(() => {
      const id = createCollection(newCollectionName);
      if (id) addCafeToCollection(id, item.id);
      setNewCollectionName("");
    });
  }
  const hasLongNote = !!cafe?.note && cafe.note.length > 90;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}?lat=${item.lat}&lng=${item.lng}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.name, url });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently no-op
    }
  }

  return (
    <div className="panel-elevated w-full overflow-hidden rounded-2xl bg-white/95 backdrop-blur dark:bg-neutral-900/95">
      <div className="flex gap-3 p-4 pb-0">
        {cafe?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cafe.image_url}
            alt={cafe.name}
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-2xl dark:bg-amber-950">
            {isCafe && cafe ? cafeIcon(cafe) : "📢"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {item.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-neutral-400">
                {cafe?.location ?? `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`}
              </div>
              {isCafe && cafe?.cost_for_two && (
                <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  💰 {cafe.cost_for_two} for two
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
              aria-label="Close"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {isCafe && (cafe?.category || cafe?.tags.length) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cafe?.category && (
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {cafe.category in CATEGORY_SHORT_LABELS
                    ? CATEGORY_SHORT_LABELS[cafe.category as Category]
                    : cafe.category}
                </span>
              )}
              {cafe?.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:bg-amber-950 dark:text-amber-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {isCafe && cafe?.hours_text && (
            <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">🕒 {cafe.hours_text}</div>
          )}

          {isCafe && cafe?.note && (
            <p
              className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${expanded ? "" : "line-clamp-2"}`}
            >
              {cafe.note}
            </p>
          )}
          {isCafe && hasLongNote && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
            >
              {expanded ? "Show less" : "View details"}
            </button>
          )}

          {billboard && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
                {billboard.width_m}m × {billboard.height_m}m
              </span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
                heading {billboard.heading_deg}°
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
            <path d="M3 11l18-8-8 18-2-8-8-2z" />
          </svg>
          Directions
        </a>
        {isCafe && (
          <button
            onClick={() => requireAuth(() => toggle(item.id))}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 ${bookmarked ? "text-amber-500" : "text-neutral-700 dark:text-neutral-200"}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill={bookmarked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.75}
              className="h-4 w-4"
            >
              <path d="M6 4h12v16l-6-4-6 4V4z" />
            </svg>
            {bookmarked ? "Saved" : "Save"}
          </button>
        )}
        <button
          onClick={share}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4" />
          </svg>
          {copied ? "Copied!" : "Share"}
        </button>

        {isCafe && (
          <div ref={collectionsRef} className="relative flex-1">
            <button
              onClick={() => setCollectionsOpen((v) => !v)}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 ${inCollectionCount > 0 ? "text-amber-500" : "text-neutral-700 dark:text-neutral-200"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                <path d="M4 6h6l2 2h8v10H4V6z" />
              </svg>
              {inCollectionCount > 0 ? `In ${inCollectionCount}` : "Add to"}
            </button>

            {collectionsOpen && (
              <div className="panel-elevated absolute right-0 bottom-full z-20 mb-2 w-56 rounded-2xl bg-white p-3 dark:bg-neutral-900">
                <div className="mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Add to collection
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {collections.length === 0 && (
                    <div className="text-xs text-neutral-400">No collections yet.</div>
                  )}
                  {collections.map((collection) => {
                    const inThis = collection.cafeIds.includes(item.id);
                    return (
                      <button
                        key={collection.id}
                        onClick={() =>
                          requireAuth(() =>
                            inThis
                              ? removeCafeFromCollection(collection.id, item.id)
                              : addCafeToCollection(collection.id, item.id)
                          )
                        }
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${inThis ? "border-amber-500 bg-amber-500 text-white" : "border-neutral-300 dark:border-neutral-600"}`}
                        >
                          {inThis && (
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                              <path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate text-neutral-700 dark:text-neutral-200">{collection.name}</span>
                      </button>
                    );
                  })}
                </div>
                <form onSubmit={submitNewCollection} className="mt-2 flex gap-1.5 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                  <input
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="New collection…"
                    className="min-w-0 flex-1 rounded-md border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  <button
                    type="submit"
                    disabled={!newCollectionName.trim()}
                    className="rounded-md bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {isCafe && (
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Have you been here?</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => requireAuth(() => setVisited(item.id, true))}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isVisited(item.id)
                  ? "bg-green-500 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              ✓ Visited
            </button>
            <button
              onClick={() => requireAuth(() => setVisited(item.id, false))}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !isVisited(item.id)
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              Not yet
            </button>
          </div>
        </div>
      )}

      {isCafe && <ReviewsSection key={item.id} cafeId={item.id} isVisited={isVisited(item.id)} />}
    </div>
  );
}
