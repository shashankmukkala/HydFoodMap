"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "hydcafemap:collections";
const listeners = new Set<() => void>();

export type Collection = {
  id: string;
  name: string;
  cafeIds: string[];
  createdAt: string;
};

function readCollections(): Collection[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Collection[]) : [];
  } catch {
    return [];
  }
}

function writeCollections(collections: Collection[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch {
    // localStorage unavailable — collections just won't persist.
  }
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

const EMPTY: Collection[] = [];
let cached: Collection[] = EMPTY;
let cachedRaw: string | null = null;

function getSnapshot(): Collection[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = raw ? readCollections() : EMPTY;
  return cached;
}

function getServerSnapshot(): Collection[] {
  return EMPTY;
}

/**
 * Named, user-created lists of cafes — distinct from the single "Saved"
 * bookmark list (lib/useBookmarks.ts). Per-browser via localStorage, same
 * as bookmarks — there's no account system to sync these across devices.
 */
export function useCollections() {
  const collections = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const createCollection = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const collection: Collection = {
      id: crypto.randomUUID(),
      name: trimmed,
      cafeIds: [],
      createdAt: new Date().toISOString(),
    };
    writeCollections([...getSnapshot(), collection]);
    return collection.id;
  }, []);

  const deleteCollection = useCallback((id: string) => {
    writeCollections(getSnapshot().filter((c) => c.id !== id));
  }, []);

  const renameCollection = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    writeCollections(getSnapshot().map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
  }, []);

  const addCafeToCollection = useCallback((collectionId: string, cafeId: string) => {
    writeCollections(
      getSnapshot().map((c) =>
        c.id === collectionId && !c.cafeIds.includes(cafeId)
          ? { ...c, cafeIds: [...c.cafeIds, cafeId] }
          : c
      )
    );
  }, []);

  const removeCafeFromCollection = useCallback((collectionId: string, cafeId: string) => {
    writeCollections(
      getSnapshot().map((c) =>
        c.id === collectionId ? { ...c, cafeIds: c.cafeIds.filter((id) => id !== cafeId) } : c
      )
    );
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
