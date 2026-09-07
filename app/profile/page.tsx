"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import type { LeaderboardEntry } from "@/app/api/leaderboard/route";
import Avatar from "@/components/Avatar";
import { AVATAR_OPTIONS, avatarKeyToValue } from "@/lib/avatars";

// Personal details for a signed-in (Google) user. The profiles row
// itself always exists by the time this loads — a database trigger
// creates it from Google's own name/avatar the moment the auth.users row
// appears (0024_profiles.sql) — so this only ever needs to read and
// optionally update it, never create one.
export default function ProfilePage() {
  const { session, loading, email, signInWithGoogle, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LeaderboardEntry | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  // Flip into "loading" the moment a session appears — adjusted during
  // render (React's recommended pattern for state driven by a prop/
  // value), not in the effect below, which can't set state synchronously
  // in its body. The effect itself only ever needs to turn loading back
  // off once the fetch resolves, which happens inside its .then()
  // callback and is fine there.
  const currentUserId = session?.user.id ?? null;
  const [lastUserId, setLastUserId] = useState(currentUserId);
  if (currentUserId !== lastUserId) {
    setLastUserId(currentUserId);
    if (currentUserId) setProfileLoading(true);
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setProfile(data);
          setName(data.display_name ?? "");
        }
        setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetch("/api/leaderboard", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.me) setStats(data.me);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function chooseAvatar(key: string) {
    if (!session || avatarSaving) return;
    setAvatarSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarKeyToValue(key), updated_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .select()
      .single();
    setAvatarSaving(false);
    if (!error) {
      setProfile(data);
      setAvatarPickerOpen(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!session || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const trimmed = name.trim();
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed || null, updated_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setProfile(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (loading) {
    return <CenteredMessage>Loading…</CenteredMessage>;
  }

  if (!session) {
    return (
      <CenteredMessage>
        <p className="text-sm text-neutral-300">Sign up or sign in to see your personal details.</p>
        <button
          onClick={() => signInWithGoogle()}
          className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Continue with Google
        </button>
        <Link href="/" className="mt-4 block text-xs text-neutral-400 hover:underline">
          ← Back to map
        </Link>
      </CenteredMessage>
    );
  }

  return (
    <div className="flex min-h-dvh w-dvw justify-center bg-[#0b0b0d] px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-xs text-neutral-400 hover:underline">
          ← Back to map
        </Link>

        <div className="panel-elevated space-y-5 rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAvatarPickerOpen((v) => !v)}
              className="profile-avatar-button"
              aria-label="Change your avatar"
            >
              <Avatar
                avatarUrl={profile?.avatar_url ?? null}
                label={profile?.display_name ?? email ?? "?"}
                className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-amber-500 text-lg font-semibold text-white"
              />
              <span className="profile-avatar-edit-badge" aria-hidden="true">✎</span>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-neutral-100">
                {profileLoading ? "…" : (profile?.display_name ?? "Your details")}
              </h1>
              <p className="truncate text-xs text-neutral-400">{email}</p>
            </div>
          </div>

          {avatarPickerOpen && (
            <div className="profile-avatar-grid">
              {AVATAR_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => chooseAvatar(option.key)}
                  disabled={avatarSaving}
                  className="profile-avatar-option"
                  style={{ background: `linear-gradient(145deg, ${option.gradient[0]}, ${option.gradient[1]})` }}
                  aria-label={`Use the ${option.key} avatar`}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          )}

          {stats && (
            <div className="profile-stats-row">
              <div className="profile-stat">
                <span className="profile-stat-value">{stats.visitedCount}</span>
                <span className="profile-stat-label">Visited</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{stats.points}</span>
                <span className="profile-stat-label">Points</span>
              </div>
              <Link href="/leaderboard" className="profile-stat profile-stat-link">
                <span className="profile-stat-value">#{stats.rank}</span>
                <span className="profile-stat-label">Rank</span>
              </Link>
            </div>
          )}

          {stats && <p className="profile-redeem-note">Redeem your points for discounts or cash — coming soon!</p>}

          <form onSubmit={handleSave} className="space-y-2.5">
            <label className="block text-[11px] font-medium tracking-wide text-neutral-400 uppercase">
              Display name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={profileLoading}
              className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-neutral-100 focus:outline-none disabled:opacity-50"
            />
            {/* This name is seeded from the Google account at signup, and
                the leaderboard is public — so people should be told what
                others actually see before deciding whether to change it.
                The shortening happens server-side in
                public_display_name() (0039); this only describes it. */}
            <p className="text-[11px] text-neutral-400">
              On the public leaderboard this shows as{" "}
              <span className="text-neutral-200">{publicNamePreview(name)}</span>. Use a nickname if you
              would rather not show your real name.
            </p>
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={profileLoading || saving}
              className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
            </button>
          </form>

          {profile && (
            <p className="text-[11px] text-neutral-500">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          )}

          <button
            onClick={() => signOut()}
            className="w-full rounded-lg bg-white/10 py-2 text-sm font-medium text-white hover:bg-white/15"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-dvw flex-col items-center justify-center bg-[#0b0b0d] px-4 text-center">
      {children}
    </div>
  );
}

// Mirrors public_display_name() in 0039 so the preview above matches what
// the leaderboard will actually publish. Kept deliberately simple and in
// sync with that SQL: first word, then the last word's initial; a
// single-word name is already a handle and is left alone.
function publicNamePreview(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return "nothing yet";
  const parts = collapsed.split(" ");
  if (parts.length === 1) return collapsed;
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
