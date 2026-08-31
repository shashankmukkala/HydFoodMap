"use client";

import { useEffect, useRef, useState } from "react";
import type { Review } from "@/lib/supabase";
import { POINTS, usePoints } from "@/lib/usePoints";
import { useRequireAuth } from "@/lib/AuthGate";

type ReviewsSectionProps = {
  cafeId: string;
  /** Reviews are gated behind marking the cafe as visited first. */
  isVisited: boolean;
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

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ReviewsSection({ cafeId, isVisited }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loading = loadedForId !== cafeId;
  const { addPoints } = usePoints();
  const requireAuth = useRequireAuth();

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
    if (rating === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment || null,
          favorite_food: favoriteFood || null,
          photo_url: photoDataUrl,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const review: Review = await res.json();
      setReviews((prev) => [review, ...prev]);

      let earned = POINTS.RATE;
      if (comment) earned += POINTS.COMMENT;
      if (photoDataUrl) earned += POINTS.PHOTO;
      if (favoriteFood) earned += POINTS.FAVORITE_FOOD;
      addPoints(earned);

      setRating(0);
      setComment("");
      setFavoriteFood("");
      setPhotoDataUrl(null);
      setFormOpen(false);
    } catch {
      // best-effort — form just stays open so they can retry
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
            <span className="text-xs text-neutral-400">{loading ? "Loading reviews…" : "No reviews yet"}</span>
          )}
        </div>
        {isVisited ? (
          <button
            onClick={() => requireAuth(() => setFormOpen((v) => !v))}
            className="text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            {formOpen ? "Cancel" : "Write a review"}
          </button>
        ) : (
          <span className="text-xs text-neutral-400">Mark as visited to review</span>
        )}
      </div>

      {formOpen && isVisited && (
        <form onSubmit={submitReview} className="mt-2.5 space-y-2">
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
            placeholder="Food you liked the most (optional, +5 pts)"
            className="w-full rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="What did you think? (optional, +5 pts)"
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
              📸 Add a photo (optional, +10 pts)
            </button>
          )}

          <button
            type="submit"
            disabled={rating === 0 || submitting}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post review"}
          </button>
        </form>
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
