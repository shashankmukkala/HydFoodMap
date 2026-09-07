"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

const NOT_CONFIGURED_ERROR =
  "Sign-in isn't set up yet — Supabase isn't configured (copy .env.local.example to .env.local and fill in your project's values).";

// Google sign-in replaced phone OTP for regular users — OTP needed an SMS
// provider (Twilio/MSG91/etc.) configured and paid for just to deliver a
// code, which was real setup friction for what should be a one-tap sign-
// in. Google OAuth needs a one-time setup too (a Google Cloud OAuth
// client + enabling the provider in Supabase Dashboard > Authentication >
// Providers > Google), but nothing to configure per-user and no ongoing
// SMS cost.
//
// Browsing the map doesn't require Supabase to be configured at all (see
// isSupabaseConfigured() and its use in the API routes' local-file
// fallback) — so this hook must degrade to "signed out" rather than
// throwing when the env vars are missing, same as the rest of the app.
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Full-page redirect to Google and back (Supabase's default OAuth
  // flow, not a popup) — the browser navigates away entirely, so any
  // in-memory "do X after sign-in" state (e.g. AuthGate's pending
  // action) doesn't survive the round trip. onAuthStateChange above
  // picks up the new session once the redirect lands back here, but
  // whatever the user was trying to do when the sign-in prompt appeared
  // needs a second tap after that — a known, accepted tradeoff of
  // redirect-based OAuth versus OTP's stay-on-page flow.
  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_ERROR };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    return { error: error?.message ?? null };
  }, []);

  // Password sign-in keyed by a plain ID (an email-shaped string in
  // auth.users, but never actually emailed anything — email_confirm is
  // set true at creation time so no delivery/verification step exists),
  // not a phone number — no SMS involved at all, which is the point: used
  // for /admin, which needs to work regardless of whether an SMS provider
  // is configured (see the Send SMS hook setup), and an admin's own login
  // shouldn't depend on SMS delivery as a new way to get locked out. The
  // account itself is created out-of-band via scripts/create-admin.mjs
  // (service-role only — see that script and the `admins` table's RLS),
  // never by self-signup here.
  const signInWithPassword = useCallback(async (id: string, password: string) => {
    if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_ERROR };
    const trimmed = id.trim();
    if (!trimmed || !password) return { error: "Enter your admin ID and password." };
    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    email: session?.user.email ?? null,
    displayName: (session?.user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (session?.user.user_metadata?.avatar_url as string | undefined) ?? null,
    isSignedIn: !!session,
    loading,
    signInWithGoogle,
    signInWithPassword,
    signOut,
  };
}
