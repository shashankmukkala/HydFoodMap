"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "hydcafemap:onboarding-dismissed";
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getServerSnapshot(): boolean {
  return true;
}

let cached = false;
let cachedRaw: string | null = null;

function getSnapshot(): boolean {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = raw === "1";
  return cached;
}

// One-time explainer banner for first-time visitors: what makes this map
// different (verified reviews, not scraped/aggregated ones) isn't visible
// just from using the UI — someone has to be told once, up front.
export function useOnboarding() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable — banner will just show again next visit.
    }
    for (const listener of listeners) listener();
  }, []);

  return { dismissed, dismiss };
}
