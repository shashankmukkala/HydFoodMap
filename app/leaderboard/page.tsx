"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import Avatar from "@/components/Avatar";
import type { LeaderboardEntry } from "@/app/api/leaderboard/route";

const MEDALS = ["🥇", "🥈", "🥉"];

// Public — no sign-in required to see who's leading, only to appear on
// it yourself (a leaderboard nobody signed-out can view isn't much of an
// incentive). "me" comes back from /api/leaderboard when signed in, so
// the caller's own row/rank shows even if they're outside the top 50.
export default function LeaderboardPage() {
  const { session } = useAuth();
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

  const meInTop = me && top.some((entry) => entry.userId === me.userId);

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
            <LeaderboardRow key={entry.userId} entry={entry} highlight={entry.userId === me?.userId} />
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
