"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";

// Per-account via the `visited_cafes` table (0025_visited_cafes_and_points_reason.sql),
// not per-browser localStorage — see useBookmarks.ts for the same
// reasoning. Explicit, self-reported "I've been here", not inferred from
// clicking a pin.
export function useVisitTracking() {
  const { session } = useAuth();
  const [visitedIds, setVisitedIds] = useState<string[]>([]);

  // Clears the moment the signed-in identity changes (most notably
  // sign-out) — adjusted during render (React's recommended pattern for
  // state driven by a prop/value), not in the effect below, which can't
  // set state synchronously in its body.
  const currentUserId = session?.user.id ?? null;
  const [lastUserId, setLastUserId] = useState(currentUserId);
  if (currentUserId !== lastUserId) {
    setLastUserId(currentUserId);
    setVisitedIds([]);
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase
      .from("visited_cafes")
      .select("cafe_id")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (!cancelled && data) setVisitedIds(data.map((row) => row.cafe_id as string));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const setVisited = useCallback(
    (cafeId: string, visited: boolean) => {
      if (!session) return;
      const userId = session.user.id;
      setVisitedIds((prev) => {
        const isVisited = prev.includes(cafeId);
        if (visited === isVisited) return prev;
        if (visited) {
          supabase
            .from("visited_cafes")
            .insert({ user_id: userId, cafe_id: cafeId })
            .then(({ error }) => {
              if (error) setVisitedIds((cur) => cur.filter((id) => id !== cafeId));
            });
          return [...prev, cafeId];
        }
        supabase
          .from("visited_cafes")
          .delete()
          .eq("user_id", userId)
          .eq("cafe_id", cafeId)
          .then(({ error }) => {
            if (error) setVisitedIds((cur) => (cur.includes(cafeId) ? cur : [...cur, cafeId]));
          });
        return prev.filter((id) => id !== cafeId);
      });
    },
    [session]
  );

  const isVisited = useCallback((cafeId: string) => visitedIds.includes(cafeId), [visitedIds]);

  return { visitedIds, visitedCount: visitedIds.length, setVisited, isVisited };
}
