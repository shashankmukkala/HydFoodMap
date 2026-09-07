"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";

// A single flat reward for posting a genuine (location-verified) review —
// deliberately NOT per-field (comment/photo/favorite food used to each add
// their own points). Paying extra for a longer review rewards padding, not
// honesty, which is exactly the incentive a "no fake reviews" platform
// shouldn't create. Redemption (vouchers etc.) isn't wired up yet — this
// just tracks the running balance so the UI has something real to show
// once redemption ships.
export const POINTS = {
  REVIEW: 10,
} as const;

// Per-account via the `points_ledger` table (0008, reason constraint
// fixed in 0025) — each row is one earn event, so the balance is always
// sum(amount) and never drifts from what was actually awarded. Not
// per-browser localStorage — see useBookmarks.ts for the same reasoning.
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

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase
      .from("points_ledger")
      .select("amount")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (!cancelled && data) setPoints(data.reduce((sum, row) => sum + (row.amount as number), 0));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const addPoints = useCallback(
    (amount: number) => {
      if (amount <= 0 || !session) return;
      setPoints((prev) => prev + amount);
      supabase
        .from("points_ledger")
        .insert({ user_id: session.user.id, amount, reason: "review" })
        .then(({ error }) => {
          if (error) setPoints((prev) => prev - amount);
        });
    },
    [session]
  );

  return { points, addPoints };
}
