"use client";

import { useEffect, useRef, useState } from "react";
import type { Billboard, Cafe } from "@/lib/supabase";
import { useBookmarks } from "@/lib/useBookmarks";
import { useCollections } from "@/lib/useCollections";
import { useVisitTracking } from "@/lib/useVisitTracking";
import { usePoints } from "@/lib/usePoints";
import { useRequireAuth } from "@/lib/AuthGate";
import { CATEGORY_ICONS, CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import ReviewsSection from "@/components/ReviewsSection";
import EditCafeTaxonomy from "@/components/EditCafeTaxonomy";
import VisitCheckin from "@/components/VisitCheckin";

function cafeIcon(cafe: Cafe) {
  if (cafe.category && cafe.category in CATEGORY_ICONS) return CATEGORY_ICONS[cafe.category as Category];
  return "☕";
}

type DetailCardProps =
  | {
      kind: "cafe";
      item: Cafe;
      onClose: () => void;
      isAdmin?: boolean;
      onCafeUpdated?: (cafe: Cafe) => void;
      /** Admin console's own session token — see EditCafeTaxonomy's Props comment. */
      adminAccessToken?: string | null;
    }
  | { kind: "billboard"; item: Billboard; onClose: () => void; isAdmin?: boolean };

export default function DetailCard(props: DetailCardProps) {
  const { kind, item, onClose, isAdmin = false } = props;
  const isCafe = kind === "cafe";
  const cafe = isCafe ? (item as Cafe) : null;
  const billboard = !isCafe ? (item as Billboard) : null;
  const { isBookmarked, toggle } = useBookmarks();
  const { collections, createCollection, addCafeToCollection, removeCafeFromCollection } = useCollections();
  const { isVisited, markVisitedLocally } = useVisitTracking();
  const { addPoints } = usePoints();
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
  // Prefer Google's own link for the business (from new_data.json's `url`
  // field) over building directions from our own geocoded lat/lng — our
  // coordinates are good enough to place a map pin but can be road-level
  // rather than building-level for addresses with no plot number (see the
  // Churrolto Film Nagar case). Falls back to lat/lng for cafes with no
  // source URL, e.g. ones pinned directly by an admin.
  const directionsUrl = cafe?.maps_url || `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;

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
    <div className={`detail-card panel-elevated w-full shrink-0 overflow-hidden rounded-3xl ${isCafe ? "detail-card-cafe" : "detail-card-ad"}`}>
      <div className="flex items-start gap-2.5 p-3.5 pb-0">
        {cafe?.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cafe.image_url}
            alt={cafe.name}
            className="detail-card-logo h-14 w-14 shrink-0 rounded-xl object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="detail-card-logo flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl dark:bg-amber-950">
            {isCafe && cafe ? cafeIcon(cafe) : "📢"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
                {item.name}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-neutral-400">
                {cafe?.location ?? (billboard?.ad_type === "rail" ? "Centre map sponsor" : `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`)}
              </div>
              {isCafe && cafe?.address && (
                <div className="mt-1 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
                  {cafe.address}
                </div>
              )}
              {isCafe && cafe?.cost_for_two && (
                <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                  💰 {cafe.cost_for_two} for two
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
              aria-label="Close"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Full-width, not nested in the text column above — the image is a
          fixed, comparatively short square, so tags/hours/note/etc. used
          to be squeezed into the narrower column beside it (indented
          past the image) while the space directly under the image sat
          empty. This starts flush with the image's own left edge instead,
          using the width the image freed up once its own row ended. */}
      <div className="px-3.5 pt-2 pb-1">
        {isCafe && (cafe?.category || cafe?.tags.length) && (
          <div className="flex flex-wrap gap-1">
            {cafe?.category && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-neutral-200">
                {cafe.category in CATEGORY_SHORT_LABELS
                  ? CATEGORY_SHORT_LABELS[cafe.category as Category]
                  : cafe.category}
              </span>
            )}
            {cafe?.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-amber-950 px-2 py-0.5 text-[10px] font-medium text-amber-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {isCafe && cafe?.hours_text && (
          <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">🕒 {cafe.hours_text}</div>
        )}

        {isCafe && cafe?.website_or_instagram && (
          <a
            href={cafe.website_or_instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block truncate text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            Website or Instagram
          </a>
        )}

        {isCafe && cafe?.note && (
          <div className="mt-3 rounded-2xl border border-amber-900/40 bg-amber-950/35 px-3 py-2.5">
            <div className="text-[10px] font-semibold tracking-[0.16em] text-amber-400 uppercase">Famous for</div>
            <p
              className={`mt-1 text-sm leading-5 text-amber-50/90 ${expanded ? "" : "line-clamp-2"}`}
            >
              {cafe.note}
            </p>
          </div>
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
          <div className="mt-3 rounded-2xl border border-amber-900/40 bg-amber-950/35 px-3 py-2.5">
            <div className="text-[10px] font-semibold tracking-[0.16em] text-amber-400 uppercase">Sponsored placement</div>
            <div className="mt-1 text-sm font-medium text-amber-50">{billboard.name}</div>
            {billboard.target_url && (
              <a
                href={billboard.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-medium text-amber-300 hover:underline"
              >
                Visit brand
              </a>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1 border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
        {billboard?.ad_type === "rail" ? (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-emerald-300/80">
            <span aria-hidden="true">▦</span>
            Map rail placement
          </span>
        ) : (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-neutral-200 hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <path d="M3 11l18-8-8 18-2-8-8-2z" />
            </svg>
            Directions
          </a>
        )}
        {isCafe && (
          <button
            onClick={() => requireAuth(() => toggle(item.id))}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium hover:bg-white/10 ${bookmarked ? "text-amber-500" : "text-neutral-700 dark:text-neutral-200"}`}
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
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-neutral-200 hover:bg-white/10"
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
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium hover:bg-white/10 ${inCollectionCount > 0 ? "text-amber-500" : "text-neutral-700 dark:text-neutral-200"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                <path d="M4 6h6l2 2h8v10H4V6z" />
              </svg>
              {inCollectionCount > 0 ? `In ${inCollectionCount}` : "Add to"}
            </button>

            {collectionsOpen && (
              <div className="panel-elevated absolute right-0 bottom-full z-20 mb-2 w-56 max-w-[85vw] rounded-2xl p-3">
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
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10"
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

      {/* Posting a review and logging a visit are visitor actions — the
          account signed into /admin is the operator, not someone checking
          in at a cafe, so neither applies there. Admins get category/tag
          editing instead (below) — correcting the data, not reacting to
          it. A visit only counts once GPS-verified (VisitCheckin), same
          rigor as a review — see lib/useLocationCheckin.ts. */}
      {isCafe && !isAdmin && (
        <VisitCheckin
          cafeId={item.id}
          cafeLat={item.lat}
          cafeLng={item.lng}
          visitedBefore={isVisited(item.id)}
          onLogged={(points) => {
            markVisitedLocally(item.id);
            addPoints(points);
          }}
        />
      )}

      {isCafe && cafe && (
        <ReviewsSection key={item.id} cafeId={item.id} cafeLat={item.lat} cafeLng={item.lng} isAdmin={isAdmin} />
      )}

      {isCafe && cafe && isAdmin && (
        <EditCafeTaxonomy
          cafe={cafe}
          accessToken={props.kind === "cafe" ? props.adminAccessToken ?? null : null}
          onSaved={(updated) => props.kind === "cafe" && props.onCafeUpdated?.(updated)}
        />
      )}
    </div>
  );
}
