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
      <div className="border-t border-line px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-awning">
            ✓ Visit logged{result.points > 0 ? ` — +${result.points} points` : ""}
          </span>
          <button onClick={reset} className="text-xs text-ink-muted hover:underline">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (gate.status === "idle") {
    return (
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
        <span className="text-xs font-medium text-ink-muted">
          {visitedBefore ? "Been here again?" : "Have you been here?"}
        </span>
        <button
          onClick={() => requireAuth(() => start())}
          className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink hover:bg-ink/10"
        >
          {visitedBefore ? "Verify another visit" : "✓ Verify my visit"}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-line px-4 py-2.5">
      {gate.status === "confirm" && (
        <div className="rounded-md bg-paper px-2.5 py-2 text-xs text-ink-muted">
          <p>We&apos;ll ask your browser for your location to confirm you&apos;re actually at this cafe — that&apos;s what keeps visits (and the points they earn) real.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={confirm}
              className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/85"
            >
              Share location & continue
            </button>
            <button type="button" onClick={reset} className="rounded-md px-3 py-1.5 text-xs text-ink-muted hover:bg-ink/5">
              Cancel
            </button>
          </div>
        </div>
      )}
      {gate.status === "locating" && <p className="text-xs text-ink-muted">Checking you&apos;re actually here…</p>}
      {gate.status === "checking-in" && <p className="text-xs text-ink-muted">Starting a secure visit check-in…</p>}
      {gate.status === "waiting" && (
        <div className="rounded-md bg-awning/10 px-2.5 py-2 text-xs text-awning">
          ✓ Visit started. Stay here for {gate.secondsLeft} more seconds while we confirm this visit.
        </div>
      )}
      {gate.status === "ready" && logging && <p className="text-xs text-ink-muted">Logging your visit…</p>}
      {gate.status === "too-far" && (
        <div className="rounded-md bg-lamp/15 px-2.5 py-2 text-xs text-lamp-ink">
          You need to be at the cafe to log a visit.{" "}
          <button onClick={reset} className="font-medium underline">
            Close
          </button>
        </div>
      )}
      {gate.status === "low-accuracy" && (
        <div className="rounded-md bg-lamp/15 px-2.5 py-2 text-xs text-lamp-ink">
          Your location is not precise enough yet. Move outside or enable precise location, then try again.{" "}
          <button onClick={reset} className="font-medium underline">
            Close
          </button>
        </div>
      )}
      {(gate.status === "error" || error) && (
        <div className="rounded-md bg-danger/10 px-2.5 py-2 text-xs text-danger">
          {error || (gate.status === "error" ? gate.message : "")}{" "}
          <button onClick={reset} className="font-medium underline">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
