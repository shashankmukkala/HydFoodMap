"use client";

import { useEffect, useState } from "react";
import { useLocationCheckin } from "@/lib/useLocationCheckin";
import { useAuth } from "@/lib/useAuth";
import { useRequireAuth } from "@/lib/AuthGate";

type Props = {
  cafeId: string;
  cafeLat: number;
  cafeLng: number;
  visitedBefore: boolean;
  onLogged: (pointsAwarded: number, firstVisit: boolean) => void;
};

// Replaces the old one-tap, unverified "Visited ✓" toggle — a visit only
// counts once the same GPS check-in + 30s dwell + re-verify reviews use
// (lib/useLocationCheckin.ts) confirms it, and app/api/cafes/[id]/log-visit
// records it. Unlike a review, there's nothing to compose afterward, so
// reaching gate.status === "ready" submits immediately instead of showing
// a form.
export default function VisitCheckin({ cafeId, cafeLat, cafeLng, visitedBefore, onLogged }: Props) {
  const { gate, start, confirm, cancel } = useLocationCheckin(cafeId, cafeLat, cafeLng);
  const { session } = useAuth();
  const requireAuth = useRequireAuth();
  const [logging, setLogging] = useState(false);
  const [result, setResult] = useState<{ points: number; firstVisit: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Flip into "logging" the instant the gate reaches "ready" — adjusted
  // during render (React's recommended pattern for state driven by a
  // prop/value) rather than inside the effect below, which can't set
  // state synchronously in its body. The effect only needs to fire the
  // actual request once `logging` is true, which happens in its .then()/
  // .finally() callbacks and is fine there.
  const [lastGateStatus, setLastGateStatus] = useState(gate.status);
  if (gate.status !== lastGateStatus) {
    setLastGateStatus(gate.status);
    if (gate.status === "ready" && !result) {
      setLogging(true);
      setError(null);
    }
  }

  useEffect(() => {
    if (gate.status !== "ready" || !session || !logging) return;
    const checkinId = gate.checkinId;
    fetch(`/api/cafes/${cafeId}/log-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ checkin_id: checkinId }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Couldn't log your visit.");
        setResult({ points: body.points_awarded ?? 0, firstVisit: !!body.firstVisit });
        onLogged(body.points_awarded ?? 0, !!body.firstVisit);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't log your visit."))
      .finally(() => setLogging(false));
    // onLogged intentionally omitted — a fresh function identity every
    // render would otherwise re-fire this whenever the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, session, cafeId, logging]);

  function reset() {
    cancel();
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            ✓ Visit logged{result.points > 0 ? ` — +${result.points} points` : ""}
          </span>
          <button onClick={reset} className="text-xs text-neutral-400 hover:underline">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (gate.status === "idle") {
    return (
      <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
          {visitedBefore ? "Been here again?" : "Have you been here?"}
        </span>
        <button
          onClick={() => requireAuth(() => start())}
          className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {visitedBefore ? "Verify another visit" : "✓ Verify my visit"}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
      {gate.status === "confirm" && (
        <div className="rounded-md bg-neutral-50 px-2.5 py-2 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
          <p>We&apos;ll ask your browser for your location to confirm you&apos;re actually at this cafe — that&apos;s what keeps visits (and the points they earn) real.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirm}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
            >
              Share location & continue
            </button>
            <button type="button" onClick={reset} className="rounded-md px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/10">
              Cancel
            </button>
          </div>
        </div>
      )}
      {gate.status === "locating" && <p className="text-xs text-neutral-400">Checking you&apos;re actually here…</p>}
      {gate.status === "checking-in" && <p className="text-xs text-neutral-400">Starting a secure visit check-in…</p>}
      {gate.status === "waiting" && (
        <div className="rounded-md bg-emerald-50 px-2.5 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          ✓ Visit started. Stay here for {gate.secondsLeft} more seconds while we confirm this visit.
        </div>
      )}
      {gate.status === "ready" && logging && <p className="text-xs text-neutral-400">Logging your visit…</p>}
      {gate.status === "too-far" && (
        <div className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
          You need to be at the cafe to log a visit.{" "}
          <button onClick={reset} className="font-medium underline">
            Close
          </button>
        </div>
      )}
      {gate.status === "low-accuracy" && (
        <div className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
          Your location is not precise enough yet. Move outside or enable precise location, then try again.{" "}
          <button onClick={reset} className="font-medium underline">
            Close
          </button>
        </div>
      )}
      {(gate.status === "error" || error) && (
        <div className="rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error || (gate.status === "error" ? gate.message : "")}{" "}
          <button onClick={reset} className="font-medium underline">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
