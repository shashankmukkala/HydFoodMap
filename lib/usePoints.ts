"use client";

import { useCallback, useSyncExternalStore } from "react";

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

const STORAGE_KEY = "hydcafemap:points";
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getServerSnapshot(): number {
  return 0;
}

let cachedPoints = 0;
let cachedRaw: string | null = null;

function getSnapshot(): number {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedPoints;
  cachedRaw = raw;
  cachedPoints = raw ? Number(raw) || 0 : 0;
  return cachedPoints;
}

function writePoints(total: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(total));
  } catch {
    // localStorage unavailable — points just won't persist.
  }
  for (const listener of listeners) listener();
}

export function usePoints() {
  const points = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addPoints = useCallback((amount: number) => {
    if (amount <= 0) return;
    writePoints(getSnapshot() + amount);
  }, []);

  return { points, addPoints };
}
