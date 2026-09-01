"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

const NOT_CONFIGURED_ERROR =
  "Sign-in isn't set up yet — Supabase isn't configured (copy .env.local.example to .env.local and fill in your project's values).";

// Real phone OTP sign-in via Supabase Auth. Requires an SMS provider
// (e.g. Twilio) configured under Authentication > Providers > Phone in the
// Supabase dashboard — otherwise signInWithOtp will fail to deliver a code.
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

  // Step 1: send the OTP code to a phone number, e.g. "+919876543210".
  const sendOtp = useCallback(async (phone: string) => {
    if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_ERROR };
    const trimmed = phone.trim();
    if (!trimmed) return { error: "Enter a phone number." };
    const { error } = await supabase.auth.signInWithOtp({ phone: trimmed });
    return { error: error?.message ?? null };
  }, []);

  // Step 2: verify the code the user received by SMS.
  const verifyOtp = useCallback(async (phone: string, token: string) => {
    if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_ERROR };
    const trimmed = phone.trim();
    const code = token.trim();
    if (!trimmed || !code) return { error: "Enter the code you received." };
    const { error } = await supabase.auth.verifyOtp({ phone: trimmed, token: code, type: "sms" });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    phone: session?.user.phone ?? null,
    isSignedIn: !!session,
    loading,
    sendOtp,
    verifyOtp,
    signOut,
  };
}
