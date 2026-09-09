"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import Avatar from "@/components/Avatar";
import type { LeaderboardEntry } from "@/app/api/leaderboard/route";

const MEDALS = ["🥇", "🥈", "🥉"];

// Members only. It was public on the reasoning that a leaderboard nobody
// signed-out can see is a weak incentive — but it lists real people's
// names, their points and how many places they have been, which is not
// something to hand to anyone who happens to load the page. Signed out it
// asks for a sign-in instead, which is also the honest pitch: this is a
// board you join, not one you spectate.
// "me" still comes back from /api/leaderboard so the caller's own row
// shows even when they are outside the top 50.
export default function LeaderboardPage() {
  const { session, loading: authLoading, signInWithGoogle } = useAuth();
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const headers: HeadersInit = session ? { Authorization: `Bearer ${session.access_token}` } : {};
    fetch("/api/leaderboard", { headers })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Couldn't load the leaderboard.");
        setTop(data.top ?? []);
        setMe(data.me ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load the leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // The API marks the caller's own row rather than returning ids to
  // compare — see LeaderboardEntry.isMe for why the UUID left the payload.
  const meInTop = me && top.some((entry) => entry.isMe);

  // Waiting on the auth check rather than assuming signed-out, so someone
  // arriving with a valid session never sees the sign-in screen flash
  // before their own ranking loads.
  if (authLoading) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-[#0b0b0d] px-4 text-sm text-neutral-400">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#0b0b0d] px-4 text-center">
        <span className="text-3xl" aria-hidden="true">🏆</span>
        <h1 className="mt-3 text-lg font-semibold text-neutral-100">Leaderboard</h1>
        <p className="mt-1 max-w-xs text-sm text-neutral-400">
          Sign up to see who is leading — and to start earning points for the places you visit.
        </p>
        <button
          onClick={() => signInWithGoogle()}
          className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Continue with Google
        </button>
        <Link href="/" className="mt-4 text-xs text-neutral-400 hover:underline">
          ← Back to map
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0b0b0d] text-neutral-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b0b0d]/95 px-5 py-4 backdrop-blur">
        <div>
          <Link href="/" className="text-xs text-neutral-400 hover:underline">
            ← Back to map
          </Link>
          <h1 className="mt-1 text-lg font-semibold">Leaderboard</h1>
          <p className="text-xs text-neutral-400">Top point earners, ranked</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5">
        {loading && <div className="admin-enquiries-empty">Loading…</div>}
        {error && !loading && <div className="admin-enquiries-empty">{error}</div>}

        {!loading && !error && me && !meInTop && (
          <div className="leaderboard-me-row">
            <LeaderboardRow entry={me} />
            <p className="leaderboard-me-hint">That&apos;s you — keep earning points to climb the board.</p>
          </div>
        )}

        {!loading && !error && top.length === 0 && (
          <div className="admin-enquiries-empty">No one has earned points yet — be the first!</div>
        )}

        {!loading &&
          !error &&
          top.map((entry) => (
            <LeaderboardRow key={entry.rank} entry={entry} highlight={entry.isMe} />
          ))}
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, highlight = false }: { entry: LeaderboardEntry; highlight?: boolean }) {
  return (
    <div className={`leaderboard-row ${highlight ? "leaderboard-row-me" : ""}`}>
      <span className="leaderboard-rank">{entry.rank <= 3 ? MEDALS[entry.rank - 1] : `#${entry.rank}`}</span>
      <Avatar avatarUrl={entry.avatarUrl} label={entry.displayName ?? "?"} className="admin-user-avatar leaderboard-avatar" />
      <span className="leaderboard-name">{entry.displayName ?? "Unnamed"}</span>
      <span className="leaderboard-visited">{entry.visitedCount} visited</span>
      <span className="leaderboard-points">★ {entry.points}</span>
    </div>
  );
}
