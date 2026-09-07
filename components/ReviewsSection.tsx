"use client";

import { useEffect, useRef, useState } from "react";
import type { Review } from "@/lib/supabase";
import { usePoints } from "@/lib/usePoints";
import { useVisitTracking } from "@/lib/useVisitTracking";
import { useRequireAuth } from "@/lib/AuthGate";
import { useAuth } from "@/lib/useAuth";
import { useLocationCheckin } from "@/lib/useLocationCheckin";
import { readAsDataUrl } from "@/lib/readAsDataUrl";

type ReviewsSectionProps = {
  cafeId: string;
  cafeLat: number;
  cafeLng: number;
  /** Admin is the operator viewing every cafe, not a visitor reacting to
   *  one — reads reviews same as anyone, but can't post one. */
  isAdmin?: boolean;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export default function ReviewsSection({ cafeId, cafeLat, cafeLng, isAdmin = false }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const { gate, start: startCheckin, confirm: checkLocation, cancel: cancelCheckin } = useLocationCheckin(cafeId, cafeLat, cafeLng);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loading = loadedForId !== cafeId;
  const { addPoints } = usePoints();
  const { markVisitedLocally } = useVisitTracking();
  const requireAuth = useRequireAuth();
  const { session } = useAuth();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cafes/${cafeId}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setReviews(Array.isArray(data) ? data : []);
        setLoadedForId(cafeId);
      })
      .catch(() => {
        if (cancelled) return;
        setReviews([]);
        setLoadedForId(cafeId);
      });
    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  const average = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  const alreadyReviewed = !!session && reviews.some((r) => r.user_id === session.user.id);

  // Reviews can only be written from the cafe's actual location — checked
  // live via the browser's geolocation, not a self-reported "I've been
  // here" checkbox (the server re-checks this independently, since a
  // client can't be trusted not to fake it — see app/api/cafes/[id]/reviews).
  //
  // Two-step on purpose: jumping straight to the browser's native location
  // prompt with zero context reads as a random, unexplained permission
  // request and drives people to just hit "Block". Explaining *why* first
  // (and requiring its own explicit tap) also keeps the geolocation call
  // inside a direct user gesture, which some browsers require anyway.
  function startReview() {
    requireAuth(() => {
      setFormOpen(true);
      startCheckin();
    });
  }

  function cancelReview() {
    setFormOpen(false);
    cancelCheckin();
    setSubmitError(null);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoDataUrl(await readAsDataUrl(file));
    } catch {
      // unreadable file — just skip the photo
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0 || gate.status !== "ready" || !session) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          rating,
          comment: comment || null,
          favorite_food: favoriteFood || null,
          photo_url: photoDataUrl,
          lat: gate.lat,
          lng: gate.lng,
          accuracy: gate.accuracy,
          checkin_id: gate.checkinId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Couldn't post your review.");
      }
      const review: Review & { points_awarded?: number } = await res.json();
      setReviews((prev) => [review, ...prev]);
      addPoints(review.points_awarded ?? 0);
      // Posting a verified review now records the visit too (see
      // lib/recordVisit.ts), so the Visited badge and count have to move
      // with it — otherwise the cafe is visited server-side but still
      // reads as unvisited until the next page load.
      markVisitedLocally(cafeId);

      setRating(0);
      setComment("");
      setFavoriteFood("");
      setPhotoDataUrl(null);
      cancelReview();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't post your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {average !== null ? (
            <>
              <span className="text-sm font-semibold text-amber-500">★ {average.toFixed(1)}</span>
              <span className="text-xs text-neutral-400">
                ({reviews.length} review{reviews.length === 1 ? "" : "s"})
              </span>
            </>
          ) : (
            <span className="text-xs text-neutral-400">{loading ? "Loading reviews…" : "Be the first to review"}</span>
          )}
        </div>
        {!isAdmin &&
          !formOpen &&
          (alreadyReviewed ? (
            <span className="text-xs text-neutral-400">You&apos;ve reviewed this place</span>
          ) : (
            <button onClick={startReview} className="text-xs font-medium text-amber-600 hover:underline dark:text-amber-400">
              Write a review
            </button>
          ))}
      </div>

      {!isAdmin && !formOpen && !loading && reviews.length === 0 && (
        <p className="mt-1 text-xs text-neutral-400">
          Every review here is verified from the cafe itself — no reviews copied from elsewhere.
        </p>
      )}

      {!isAdmin && formOpen && (
        <div className="mt-2.5">
          {gate.status === "confirm" && (
            <div className="rounded-md bg-neutral-50 px-2.5 py-2 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
              <p>We&apos;ll ask your browser for your location, just to confirm you&apos;re at this cafe — that&apos;s what keeps reviews here real. It&apos;s only checked once, right now.</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={checkLocation}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                >
                  Share location & continue
                </button>
                <button
                  type="button"
                  onClick={cancelReview}
                  className="rounded-md px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {gate.status === "locating" && (
            <p className="text-xs text-neutral-400">Checking you&apos;re actually here…</p>
          )}
          {gate.status === "checking-in" && (
            <p className="text-xs text-neutral-400">Starting a secure visit check-in…</p>
          )}
          {gate.status === "waiting" && (
            <div className="rounded-md bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              ✓ Visit started. Stay here for {gate.secondsLeft} more seconds while we confirm this visit.
            </div>
          )}
          {gate.status === "too-far" && (
            <div className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              You need to be at the cafe to leave a review — this keeps reviews real.{" "}
              <button onClick={cancelReview} className="font-medium underline">
                Close
              </button>
            </div>
          )}
          {gate.status === "low-accuracy" && (
            <div className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              Your location is not precise enough yet. Move outside or enable precise location, then try again.{' '}
              <button onClick={cancelReview} className="font-medium underline">
                Close
              </button>
            </div>
          )}
          {gate.status === "error" && (
            <div className="rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {gate.message}{" "}
              <button onClick={cancelReview} className="font-medium underline">
                Close
              </button>
            </div>
          )}

          {gate.status === "ready" && (
            <form onSubmit={submitReview} className="space-y-2">
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">✓ Verified visit confirmed</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">✓ Precise location confirmed</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating((prev) => (prev === star ? 0 : star))}
                    className={`text-xl leading-none ${star <= rating ? "text-amber-400" : "text-neutral-200 dark:text-neutral-700"}`}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input
                value={favoriteFood}
                onChange={(e) => setFavoriteFood(e.target.value)}
                placeholder="Food you liked the most (optional)"
                className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800"
              />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="What did you think? (optional)"
                className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800"
              />

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              {photoDataUrl ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoDataUrl} alt="Review attachment" className="h-12 w-12 rounded-md object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="text-xs text-neutral-400 hover:underline"
                  >
                    Remove photo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-dashed border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-500 hover:border-amber-400 hover:text-amber-500 dark:border-neutral-600 dark:text-neutral-400"
                >
                  📸 Add a photo (optional)
                </button>
              )}

              {submitError && <p className="text-xs text-red-500">{submitError}</p>}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={rating === 0 || submitting}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {submitting ? "Posting…" : "Post review"}
                </button>
                <button
                  type="button"
                  onClick={cancelReview}
                  className="rounded-md px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {reviews.length > 0 && (
        <div className="mt-2.5 max-h-40 space-y-2.5 overflow-y-auto">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-2 text-xs">
              {review.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={review.photo_url}
                  alt="Review attachment"
                  className="h-10 w-10 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-500">{"★".repeat(review.rating)}</span>
                  <span className="text-neutral-400">· {timeAgo(review.created_at)}</span>
                </div>
                {review.checkin_id && (
                  <span className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    ✓ Verified visit
                  </span>
                )}
                {review.favorite_food && (
                  <p className="mt-0.5 text-amber-600 dark:text-amber-400">🍽️ {review.favorite_food}</p>
                )}
                {review.comment && <p className="mt-0.5 text-neutral-600 dark:text-neutral-300">{review.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
