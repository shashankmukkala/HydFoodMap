"use client";

import { useEffect, useState } from "react";
import PageBanner from "@/components/PageBanner";
import SiteFooter from "@/components/SiteFooter";
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
  // arriving with a valid session never sees the sign-in prompt flash
  // before their own ranking loads.
  let body: React.ReactNode;
  if (authLoading) {
    body = <div className="admin-enquiries-empty">Loading…</div>;
  } else if (!session) {
    body = (
      <div className="rounded-[10px] border border-line bg-white px-6 py-10 text-center">
        <h2 className="display text-[26px] leading-tight text-ink">A board you join, not one you watch.</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
          Sign up to see who is leading — and to start earning points for the places you visit.
        </p>
        <button onClick={() => signInWithGoogle()} className="btn-primary mt-6">
          Continue with Google
        </button>
      </div>
    );
  } else {
    body = (
      <>
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

        {!loading && !error && top.length > 0 && (
          <div>
            {top.map((entry) => (
              <LeaderboardRow key={entry.rank} entry={entry} highlight={entry.isMe} />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <PageBanner
        active="leaderboard"
        eyebrow="Leaderboard"
        title="Who has been everywhere."
        lede="Points for every visit your phone can vouch for, and every review you leave."
      />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">{body}</div>
      <SiteFooter />
    </main>
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
