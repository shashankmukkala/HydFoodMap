"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "hydcafemap:bookmarked-cafe-ids";
const listeners = new Set<() => void>();

function readStoredIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

const EMPTY: string[] = [];

function getServerSnapshot(): string[] {
  return EMPTY;
}

let cachedIds: string[] = EMPTY;
let cachedRaw: string | null = null;

function getSnapshot(): string[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedIds;
  cachedRaw = raw;
  cachedIds = raw ? readStoredIds() : EMPTY;
  return cachedIds;
}

function writeIds(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable (private mode, etc.) — bookmark just won't persist.
  }
  for (const listener of listeners) listener();
}

export function useBookmarks() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((id: string) => {
    const current = getSnapshot();
    const next = current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id];
    writeIds(next);
  }, []);

  const isBookmarked = useCallback((id: string) => ids.includes(id), [ids]);

  return { bookmarkedIds: ids, toggle, isBookmarked };
}
