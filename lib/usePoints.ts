"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";

// Historical default shown before app/api/points-config's live values load
// — the actual reward is admin-configurable now (0029_points_config_and_
// leaderboard.sql) and read server-side by the award_review_points/
// award_visit_points triggers, not by the client.
export const POINTS = {
  REVIEW: 10,
} as const;

// Per-account via the `points_ledger` table (0008, reason constraint most
// recently extended in 0029) — each row is one earn event, so the balance
// is always sum(amount) and never drifts from what was actually awarded.
// Not per-browser localStorage — see useBookmarks.ts for the same
// reasoning.
export function usePoints() {
  const { session } = useAuth();
  const [points, setPoints] = useState(0);

  // Clears the moment the signed-in identity changes (most notably
  // sign-out) — adjusted during render (React's recommended pattern for
  // state driven by a prop/value), not in the effect below, which can't
  // set state synchronously in its body.
  const currentUserId = session?.user.id ?? null;
  const [lastUserId, setLastUserId] = useState(currentUserId);
  if (currentUserId !== lastUserId) {
    setLastUserId(currentUserId);
    setPoints(0);
  }

  const refresh = useCallback(() => {
    if (!session) return;
    return supabase
      .from("points_ledger")
      .select("amount")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (data) setPoints(data.reduce((sum, row) => sum + (row.amount as number), 0));
      });
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Local-only optimistic bump — NOT a write to points_ledger. Every real
  // award now happens server-side (a security-definer trigger tied to a
  // verified action, or an admin route using the service role); there is
  // deliberately no RLS insert policy left for a client to write its own
  // points_ledger rows any more (0029 dropped it — a user could
  // previously insert any {amount, reason} row into their own ledger,
  // since RLS only checked ownership, never the value). This just moves
  // the visible number instantly while the real row lands, and refresh()
  // reconciles it against the database on the next call.
  const addPoints = useCallback((amount: number) => {
    if (amount <= 0) return;
    setPoints((prev) => prev + amount);
  }, []);

  return { points, addPoints, refresh };
}
