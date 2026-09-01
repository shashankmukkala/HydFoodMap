"use client";

import { useEffect, useState } from "react";

type Result = { lat: number; lng: number; address: string | null };

// Resolves a clicked/dragged lat/lng into a real address, so an admin
// placing a pin sees where it actually is instead of just raw coordinates.
// Re-resolves whenever the coords change (initial click or a drag).
export function useReverseGeocode(coords: { lng: number; lat: number }) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/geocode?lat=${coords.lat}&lon=${coords.lng}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setResult({ lat: coords.lat, lng: coords.lng, address: data?.display_name ?? null });
      })
      .catch(() => {
        if (!cancelled) setResult({ lat: coords.lat, lng: coords.lng, address: null });
      });
    return () => {
      cancelled = true;
    };
  }, [coords.lat, coords.lng]);

  const loading = !result || result.lat !== coords.lat || result.lng !== coords.lng;
  const address = loading ? null : result.address;
  const status: "loading" | "idle" | "error" = loading ? "loading" : address ? "idle" : "error";

  return { address, status };
}
