"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";

// Per-account via the `visited_cafes` table (0025, RLS tightened in
// 0031) — read-only now. There used to be a `setVisited` here that
// inserted/deleted rows directly from the client with zero proof of ever
// actually being at the cafe; 0031 dropped that table's insert/delete
// policies for exactly that reason. Recording a real visit now only
// happens server-side, gated by the same GPS check-in reviews use — see
// app/api/cafes/[id]/log-visit and the "Have you been here?" flow in
// components/DetailCard.tsx. `markVisitedLocally` below is this hook's
// only remaining write, and it's local-only (optimistic UI, no DB call).
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

  // Optimistic-only — the real row was already written server-side by the
  // time this is called (see app/api/cafes/[id]/log-visit). This just
  // moves this hook instance's own badge/list without a redundant
  // round trip; nothing here writes to the database.
  const markVisitedLocally = useCallback((cafeId: string) => {
    setVisitedIds((prev) => (prev.includes(cafeId) ? prev : [...prev, cafeId]));
  }, []);

  const isVisited = useCallback((cafeId: string) => visitedIds.includes(cafeId), [visitedIds]);

  return { visitedIds, visitedCount: visitedIds.length, markVisitedLocally, isVisited };
}
