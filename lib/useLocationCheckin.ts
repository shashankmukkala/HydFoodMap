"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { distanceMeters, VISIT_RADIUS_METERS } from "@/lib/geo";

export type CheckinGateState =
  | { status: "idle" }
  | { status: "confirm" }
  | { status: "locating" }
  | { status: "checking-in" }
  | { status: "waiting"; checkinId: string; secondsLeft: number }
  | { status: "ready"; checkinId: string; lat: number; lng: number; accuracy: number }
  | { status: "too-far" }
  | { status: "low-accuracy" }
  | { status: "error"; message: string };

const CHECKIN_WAIT_SECONDS = 30;

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser can't share your location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
  });
}

// The GPS check-in + 30s dwell + re-verify state machine — originally
// built for reviews (app/api/cafes/[id]/check-in{,/verify}, which are
// already cafe-generic, not review-specific), extracted here so a
// verified visit (lib/useVisitLogging.ts) can require the exact same
// anti-spoofing rigor rather than a separate, possibly weaker check.
// One "genuinely here for 30 seconds" proof, reused for both — a review
// and a visit differ only in what happens after `gate.status === "ready"`.
export function useLocationCheckin(cafeId: string, cafeLat: number, cafeLng: number) {
  const [gate, setGate] = useState<CheckinGateState>({ status: "idle" });
  const { session } = useAuth();

  const start = useCallback(() => setGate({ status: "confirm" }), []);
  const cancel = useCallback(() => setGate({ status: "idle" }), []);

  const confirm = useCallback(async () => {
    setGate({ status: "locating" });
    try {
      const pos = await getCurrentPosition();
      const dist = distanceMeters(
        { lat: pos.coords.latitude, lng: pos.coords.longitude },
        { lat: cafeLat, lng: cafeLng }
      );
      if (pos.coords.accuracy > 150) {
        setGate({ status: "low-accuracy" });
        return;
      }
      if (dist > VISIT_RADIUS_METERS) {
        setGate({ status: "too-far" });
        return;
      }
      if (!session) {
        setGate({ status: "error", message: "Sign in again to verify your visit." });
        return;
      }

      setGate({ status: "checking-in" });
      const response = await fetch(`/api/cafes/${cafeId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Couldn't start a verified check-in.");
      setGate({ status: "waiting", checkinId: body.checkin_id, secondsLeft: body.wait_seconds ?? CHECKIN_WAIT_SECONDS });
    } catch (error) {
      setGate({ status: "error", message: error instanceof Error ? error.message : "Couldn't verify your location." });
    }
  }, [cafeId, cafeLat, cafeLng, session]);

  const waitingCheckinId = gate.status === "waiting" ? gate.checkinId : null;

  useEffect(() => {
    if (!waitingCheckinId || !session) return;
    const checkinId = waitingCheckinId;
    const timer = window.setTimeout(async () => {
      try {
        const pos = await getCurrentPosition();
        const response = await fetch(`/api/cafes/${cafeId}/check-in/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            checkin_id: checkinId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Couldn't verify your visit.");
        setGate({ status: "ready", checkinId, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      } catch (error) {
        setGate({ status: "error", message: error instanceof Error ? error.message : "Couldn't verify your visit." });
      }
    }, CHECKIN_WAIT_SECONDS * 1000);
    const countdown = window.setInterval(() => {
      setGate((current) =>
        current.status === "waiting" ? { ...current, secondsLeft: Math.max(0, current.secondsLeft - 1) } : current
      );
    }, 1000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(countdown);
    };
  }, [cafeId, waitingCheckinId, session]);

  return { gate, start, confirm, cancel };
}
