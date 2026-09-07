"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";

export type Collection = {
  id: string;
  name: string;
  cafeIds: string[];
  createdAt: string;
};

type CollectionRow = {
  id: string;
  name: string;
  created_at: string;
  collection_cafes: { cafe_id: string }[] | null;
};

/**
 * Named, user-created lists of cafes — distinct from the single "Saved"
 * bookmark list (lib/useBookmarks.ts). Per-account via the `collections`
 * and `collection_cafes` tables (0008_users_bookmarks_collections_points.sql),
 * not per-browser localStorage — see useBookmarks.ts for the same
 * reasoning.
 *
 * createCollection stays synchronous (returns the new id immediately,
 * not a Promise) to match every caller's existing "create it, then
 * immediately add a cafe to it" pattern (e.g. DetailCard's
 * submitNewCollection) — the id is generated client-side with
 * crypto.randomUUID() and sent as-is in the insert, so it's known before
 * the network round trip finishes rather than after.
 */
export function useCollections() {
  const { session } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);

  // Clears the moment the signed-in identity changes (most notably
  // sign-out) — adjusted during render (React's recommended pattern for
  // state driven by a prop/value), not in the effect below, which can't
  // set state synchronously in its body.
  const currentUserId = session?.user.id ?? null;
  const [lastUserId, setLastUserId] = useState(currentUserId);
  if (currentUserId !== lastUserId) {
    setLastUserId(currentUserId);
    setCollections([]);
  }

  // Inlined directly in the effect (not a separately defined async
  // callback invoked from here) — the lint rule that forbids setting
  // state synchronously in an effect body flags any function reference
  // that transitively calls setState, even genuinely async ones behind
  // an await, if it's invoked directly rather than via .then()/.catch().
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase
      .from("collections")
      .select("id, name, created_at, collection_cafes(cafe_id)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setCollections(
          (data as unknown as CollectionRow[]).map((row) => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            cafeIds: (row.collection_cafes ?? []).map((cc) => cc.cafe_id),
          }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const createCollection = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || !session) return null;
      const id = crypto.randomUUID();
      const optimistic: Collection = { id, name: trimmed, cafeIds: [], createdAt: new Date().toISOString() };
      setCollections((prev) => [...prev, optimistic]);
      supabase
        .from("collections")
        .insert({ id, user_id: session.user.id, name: trimmed })
        .then(({ error }) => {
          if (error) setCollections((prev) => prev.filter((c) => c.id !== id));
        });
      return id;
    },
    [session]
  );

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
    // collection_cafes rows cascade-delete with the parent (0008's FK),
    // no separate cleanup needed here.
    supabase.from("collections").delete().eq("id", id).then(() => {});
  }, []);

  const renameCollection = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
    supabase.from("collections").update({ name: trimmed }).eq("id", id).then(() => {});
  }, []);

  const addCafeToCollection = useCallback((collectionId: string, cafeId: string) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId && !c.cafeIds.includes(cafeId) ? { ...c, cafeIds: [...c.cafeIds, cafeId] } : c
      )
    );
    supabase
      .from("collection_cafes")
      .insert({ collection_id: collectionId, cafe_id: cafeId })
      .then(() => {});
  }, []);

  const removeCafeFromCollection = useCallback((collectionId: string, cafeId: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === collectionId ? { ...c, cafeIds: c.cafeIds.filter((id) => id !== cafeId) } : c))
    );
    supabase
      .from("collection_cafes")
      .delete()
      .eq("collection_id", collectionId)
      .eq("cafe_id", cafeId)
      .then(() => {});
  }, []);

  return {
    collections,
    createCollection,
    deleteCollection,
    renameCollection,
    addCafeToCollection,
    removeCafeFromCollection,
  };
}
