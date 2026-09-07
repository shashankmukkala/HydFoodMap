"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";

// Per-account via the `bookmarks` table (0008_users_bookmarks_collections_points.sql),
// not per-browser localStorage — two people signed into the same browser
// now correctly see their own bookmarks, and one person sees the same
// list on every device. `toggle` updates local state immediately (the
// UI shouldn't wait on a round trip to react to a tap) and reverts if
// the write fails; callers are already expected to only call it from
// inside requireAuth (see AuthGate), so `session` being null here is a
// defensive no-op, not a normal path.
export function useBookmarks() {
  const { session } = useAuth();
  const [ids, setIds] = useState<string[]>([]);

  // Clears the moment the signed-in identity changes (most notably
  // sign-out) — adjusted during render (React's recommended pattern for
  // state driven by a prop/value), not in the effect below, which can't
  // set state synchronously in its body.
  const currentUserId = session?.user.id ?? null;
  const [lastUserId, setLastUserId] = useState(currentUserId);
  if (currentUserId !== lastUserId) {
    setLastUserId(currentUserId);
    setIds([]);
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase
      .from("bookmarks")
      .select("cafe_id")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (!cancelled && data) setIds(data.map((row) => row.cafe_id as string));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const toggle = useCallback(
    (id: string) => {
      if (!session) return;
      const userId = session.user.id;
      setIds((prev) => {
        const wasBookmarked = prev.includes(id);
        if (wasBookmarked) {
          supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", userId)
            .eq("cafe_id", id)
            .then(({ error }) => {
              if (error) setIds((cur) => (cur.includes(id) ? cur : [...cur, id]));
            });
          return prev.filter((existing) => existing !== id);
        }
        supabase
          .from("bookmarks")
          .insert({ user_id: userId, cafe_id: id })
          .then(({ error }) => {
            if (error) setIds((cur) => cur.filter((existing) => existing !== id));
          });
        return [...prev, id];
      });
    },
    [session]
  );

  const isBookmarked = useCallback((id: string) => ids.includes(id), [ids]);

  return { bookmarkedIds: ids, toggle, isBookmarked };
}
