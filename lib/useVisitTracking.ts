"use client";

import { useCallback, useSyncExternalStore } from "react";

const VISITED_KEY = "hydcafemap:visited-cafe-ids";
const listeners = new Set<() => void>();

function readIds(): string[] {
  try {
    const raw = window.localStorage.getItem(VISITED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    window.localStorage.setItem(VISITED_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable — mark just won't persist.
  }
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

const EMPTY: string[] = [];
let cached: string[] = EMPTY;
let cachedRaw: string | null = null;

function getSnapshot(): string[] {
  const raw = window.localStorage.getItem(VISITED_KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = raw ? readIds() : EMPTY;
  return cached;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

/**
 * Explicit, self-reported "I've been here" — not inferred from clicking a
 * pin. Per-browser (no account system exists), via localStorage, same
 * caveat as bookmarks/collections: doesn't sync across devices, resets in
 * a private window or if site data is cleared.
 */
export function useVisitTracking() {
  const visitedIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setVisited = useCallback((cafeId: string, visited: boolean) => {
    const current = getSnapshot();
    const isVisited = current.includes(cafeId);
    if (visited === isVisited) return;
    writeIds(visited ? [...current, cafeId] : current.filter((id) => id !== cafeId));
  }, []);

  const isVisited = useCallback((cafeId: string) => visitedIds.includes(cafeId), [visitedIds]);

  return { visitedIds, visitedCount: visitedIds.length, setVisited, isVisited };
}
