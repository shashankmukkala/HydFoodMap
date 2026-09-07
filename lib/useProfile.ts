"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

// The signed-in user's `profiles` row (0024_profiles.sql) — display_name
// and avatar_url as the user actually set them (edited on /profile, or
// the preset avatar assigned at signup/backfill — 0034/0035), not
// Google's raw session metadata. useAuth() used to hand out
// user_metadata.full_name/avatar_url directly, which meant a name/avatar
// edited on /profile never showed up anywhere else (e.g. the top bar) —
// it was reading the original Google values forever, not what's actually
// stored.
export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  // Clears the moment the signed-in identity changes — adjusted during
  // render (React's recommended pattern for state driven by a prop/
  // value), not in the effect below, which can't set state synchronously
  // in its body.
  const currentUserId = session?.user.id ?? null;
  const [lastUserId, setLastUserId] = useState(currentUserId);
  if (currentUserId !== lastUserId) {
    setLastUserId(currentUserId);
    setProfile(null);
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setProfile(data);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return profile;
}
