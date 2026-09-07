"use client";

import { useEffect, useRef, useState } from "react";
import type { Billboard, Cafe } from "@/lib/supabase";
import { useBookmarks } from "@/lib/useBookmarks";
import { useCollections } from "@/lib/useCollections";
import { useVisitTracking } from "@/lib/useVisitTracking";
import { usePoints } from "@/lib/usePoints";
import { useRequireAuth } from "@/lib/AuthGate";
import { CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import { TAG_ICONS, type Tag } from "@/lib/tags";
import ReviewsSection from "@/components/ReviewsSection";
import EditCafeTaxonomy from "@/components/EditCafeTaxonomy";
import VisitCheckin from "@/components/VisitCheckin";
import { MOBILE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { useSwipeToDismiss } from "@/lib/useSwipeToDismiss";


/** Tags run to 8 on some cafes; beyond three they stop informing and start crowding. */
const TAG_DISPLAY_LIMIT = 3;

/**
 * Shows a link as its destination rather than as the name of the field it
 * was stored in. "https://www.instagram.com/roastery/" reads as
 * "instagram.com/roastery" — enough to know where the tap goes.
 */
function prettyLink(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  }
}

type DetailCardProps =
  | {
      kind: "cafe";
      item: Cafe;
      onClose: () => void;
      isAdmin?: boolean;
      onCafeUpdated?: (cafe: Cafe) => void;
      /**
       * Verified review average and count, from the bulk ratings endpoint
       * MapExperience already loads. Passed in rather than fetched here so
       * opening a card costs no extra request, and so the number in the
       * header is the same one the rating filter used.
       */
      rating?: { avg: number; count: number } | null;
      /** Admin console's own session token — see EditCafeTaxonomy's Props comment. */
      adminAccessToken?: string | null;
    }
  | { kind: "billboard"; item: Billboard; onClose: () => void; isAdmin?: boolean };

export default function DetailCard(props: DetailCardProps) {
  const { kind, item, onClose, isAdmin = false } = props;
  const rating = props.kind === "cafe" ? (props.rating ?? null) : null;
  const isCafe = kind === "cafe";
  const cafe = isCafe ? (item as Cafe) : null;
  const billboard = !isCafe ? (item as Billboard) : null;
  const { isBookmarked, toggle } = useBookmarks();
  const { collections, createCollection, addCafeToCollection, removeCafeFromCollection } = useCollections();
  const { isVisited, markVisitedLocally } = useVisitTracking();
  const { addPoints } = usePoints();
  const requireAuth = useRequireAuth();
  const [copied, setCopied] = useState(false);
  // A broken image URL used to be hidden by writing display:none onto the
  // node in an onError handler, which left an empty banner slot in the
  // layout. Tracking it as state removes the element instead.
  const [imageFailed, setImageFailed] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const collectionsRef = useRef<HTMLDivElement>(null);
  // Drag-to-dismiss is a phone gesture; on desktop the card is a column
  // panel with a pointer and a close button, and binding touch listeners
  // there would be dead weight.
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const sheetRef = useSwipeToDismiss<HTMLDivElement>(onClose, isMobile);

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
    <div
      ref={sheetRef}
      className={`detail-card panel-elevated w-full shrink-0 overflow-hidden rounded-3xl ${isCafe ? "detail-card-cafe" : "detail-card-ad"}`}
      role="dialog"
      aria-label={item.name}
    >
      {/* Visible only on small screens (CSS). Purely the visual cue that
          the sheet can be dragged away — deliberately not a button: the
          drag listener sits on the card itself, so a tappable grabber
          would fire its click at the end of any drag that did not travel
          far enough to dismiss, closing the card the user was trying to
          pull back. There are already four ways out (swipe, the 44px X,
          tapping the map, Escape). */}
      <div className="detail-card-grabber" aria-hidden="true">
        <span />
      </div>

      {/* A photo, when there is one, is a full-width banner rather than a
          56px tile. Only 5 of 85 cafes carry an image_url, so the tile
          rendered a generic emoji square 94% of the time — the weakest
          possible thing to open a card with. Absent, the name simply
          leads, which reads as deliberate rather than as a gap. */}
      {isCafe && cafe?.image_url && !imageFailed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cafe.image_url}
          alt=""
          className="detail-card-banner"
          onError={() => setImageFailed(true)}
        />
      )}

      <div className="flex items-start gap-2.5 p-3.5 pb-0">

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="detail-card-name truncate">{item.name}</h2>
              {/* Area and type on one line, separated by a dot. They were
                  two stacked rows plus a third for the address, which gave
                  three lines of grey meta before anything useful. */}
              <div className="detail-card-meta truncate">
                {isCafe
                  ? [cafe?.location, cafe?.category && (CATEGORY_SHORT_LABELS[cafe.category as Category] ?? cafe.category)]
                      .filter(Boolean)
                      .join(" · ")
                  : billboard?.ad_type === "rail"
                    ? "Centre map sponsor"
                    : `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`}
              </div>
              {isCafe && cafe?.cost_for_two && (
                <div className="detail-card-meta">{cafe.cost_for_two} for two</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="panel-close-button shrink-0 rounded-full text-neutral-400 hover:bg-white/10 hover:text-neutral-200"
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
      <div className="px-3.5 pt-2.5 pb-1">
        {/* The card's one emphasised element, and the only claim this
            product can make that a general map cannot: these ratings come
            from people whose phone confirmed they were standing here.
            Mint because the design system reserves mint for trust — the
            card previously spent amber, the *advertising* colour, on
            editorial content and left mint unused.
            With no reviews yet on any cafe this empty state is the normal
            case, not an edge case, so it asks for the first visit rather
            than rendering a blank. */}
        {isCafe &&
          (rating && rating.count > 0 ? (
            <div className="verified-seal">
              <span className="verified-seal-mark" aria-hidden="true">✓</span>
              <span className="verified-seal-score">{rating.avg.toFixed(1)}</span>
              <span className="verified-seal-label">
                {rating.count} verified {rating.count === 1 ? "visit" : "visits"}
              </span>
            </div>
          ) : (
            <div className="verified-seal verified-seal-empty">
              <span className="verified-seal-mark" aria-hidden="true">✓</span>
              <span className="verified-seal-label">No verified visits yet — be the first</span>
            </div>
          ))}

        {/* Moved above the tags: it is the only editorial writing on the
            card, present for all 85 cafes, and it was buried under three
            rows of chrome. Neutral surface now, so amber can go back to
            meaning "sponsored". No clamp — the longest note in the data is
            89 characters, about two lines, and the expand toggle that used
            to sit here required 90+ so it could never actually appear. */}
        {isCafe && cafe?.note && (
          <div className="known-for">
            <div className="known-for-eyebrow">Known for</div>
            <p className="known-for-text">{cafe.note}</p>
          </div>
        )}

        {/* Capped, because tags run to 8 on some cafes and a wall of
            equal-weight chips reads as noise rather than information. */}
        {isCafe && cafe && cafe.tags.length > 0 && (
          <div className="detail-card-tags">
            {cafe.tags.slice(0, TAG_DISPLAY_LIMIT).map((tag) => (
              <span key={tag} className="detail-card-tag">
                {TAG_ICONS[tag as Tag] && <span aria-hidden="true">{TAG_ICONS[tag as Tag]}</span>}
                {tag}
              </span>
            ))}
            {cafe.tags.length > TAG_DISPLAY_LIMIT && (
              <span className="detail-card-tag detail-card-tag-more">
                +{cafe.tags.length - TAG_DISPLAY_LIMIT}
              </span>
            )}
          </div>
        )}

        {isCafe && cafe?.hours_text && (
          <div className="detail-card-meta mt-2">{cafe.hours_text}</div>
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

      {/* One primary action, then icons. These were four identical
          flex-1 cells at the same weight, so nothing read as the thing to
          do — while Directions is the reason most people open a cafe at
          all. Save/Share/Collections keep their full hit area but drop
          their labels, which also stops the row wrapping on narrow
          phones. */}
      <div className="detail-card-actions">
        {billboard?.ad_type === "rail" ? (
          <span className="detail-card-action-primary detail-card-action-static">
            <span aria-hidden="true">▦</span>
            Map rail placement
          </span>
        ) : (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-card-action-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-4 w-4">
              <path d="M3 11l18-8-8 18-2-8-8-2z" strokeLinejoin="round" />
            </svg>
            Directions
          </a>
        )}
        {isCafe && (
          <button
            onClick={() => requireAuth(() => toggle(item.id))}
            aria-label={bookmarked ? "Remove from favourites" : "Save to favourites"}
            aria-pressed={bookmarked}
            title={bookmarked ? "Saved" : "Save"}
            className={`detail-card-action-icon ${bookmarked ? "is-active" : ""}`}
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
          </button>
        )}
        <button
          onClick={share}
          aria-label="Share this place"
          title={copied ? "Link copied" : "Share"}
          className={`detail-card-action-icon ${copied ? "is-active" : ""}`}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <circle cx="18" cy="5" r="2.5" />
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="18" cy="19" r="2.5" />
              <path d="M8.3 10.7l7.4-4.4M8.3 13.3l7.4 4.4" />
            </svg>
          )}
        </button>

        {isCafe && (
          <div ref={collectionsRef} className="relative">
            <button
              onClick={() => setCollectionsOpen((v) => !v)}
              aria-label={inCollectionCount > 0 ? `In ${inCollectionCount} collections` : "Add to a collection"}
              aria-expanded={collectionsOpen}
              title={inCollectionCount > 0 ? `In ${inCollectionCount}` : "Add to collection"}
              className={`detail-card-action-icon ${inCollectionCount > 0 ? "is-active" : ""}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                <path d="M4 6h6l2 2h8v10H4V6z" />
              </svg>
              {inCollectionCount > 0 && <span className="detail-card-action-badge">{inCollectionCount}</span>}
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
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${inThis ? "border-[#79e2b2] bg-[#79e2b2] text-[#06231a]" : "border-neutral-300 dark:border-neutral-600"}`}
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
                    className="min-w-0 flex-1 rounded-md border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#79e2b2]/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  <button
                    type="submit"
                    disabled={!newCollectionName.trim()}
                    className="rounded-md bg-[#79e2b2] px-2 py-1 text-xs font-semibold text-[#06231a] hover:bg-[#8ceac0] disabled:opacity-50"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reference detail, below the actions rather than above them: you
          need the address once you have decided to go, not while deciding.
          The link names its destination ("instagram.com/…") instead of
          labelling the field it came from — the old "Website or Instagram"
          told you which column it was stored in, not where it goes. */}
      {isCafe && (cafe?.address || cafe?.website_or_instagram) && (
        <div className="detail-card-footnote">
          {cafe?.address && <div className="detail-card-address">{cafe.address}</div>}
          {cafe?.website_or_instagram && (
            <a
              href={cafe.website_or_instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-card-link"
            >
              {prettyLink(cafe.website_or_instagram)}
            </a>
          )}
        </div>
      )}

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
