"use client";

import { useCallback, useSyncExternalStore } from "react";

// Dummy sign-in: collects a phone number and trusts it, no OTP yet.
// Swap the body of signIn() for a real OTP flow later — the storage
// shape (just a phone string) can stay the same.
const STORAGE_KEY = "hydcafemap:auth-phone";
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getServerSnapshot(): string | null {
  return null;
}

let cachedPhone: string | null = null;
let cachedRaw: string | null = null;
let initialized = false;

function getSnapshot(): string | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (initialized && raw === cachedRaw) return cachedPhone;
  initialized = true;
  cachedRaw = raw;
  cachedPhone = raw;
  return cachedPhone;
}

function writePhone(phone: string | null) {
  try {
    if (phone) window.localStorage.setItem(STORAGE_KEY, phone);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable — sign-in just won't persist across reloads.
  }
  for (const listener of listeners) listener();
}

export function useAuth() {
  const phone = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const signIn = useCallback((rawPhone: string) => {
    const trimmed = rawPhone.trim();
    if (!trimmed) return;
    writePhone(trimmed);
  }, []);

  const signOut = useCallback(() => writePhone(null), []);

  return { phone, isSignedIn: !!phone, signIn, signOut };
}
