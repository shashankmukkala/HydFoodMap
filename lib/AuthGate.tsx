"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import SignInModal from "@/components/SignInModal";

type AuthGateContextValue = {
  requireAuth: (action: () => void) => void;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

// Google sign-in (useAuth's signInWithGoogle) is a full-page redirect to
// Google and back, unlike the old OTP flow which stayed on this page the
// whole time. That means there's no way to remember "run this action
// once sign-in finishes" across the round trip — the entire page,
// including this provider's state, is gone and freshly remounted by the
// time the user returns signed in. So requireAuth only ever does one of
// two things: run the action immediately if already signed in, or open
// the prompt if not. It does not — and structurally cannot — resume the
// original action after a fresh sign-in; the user taps whatever they
// were doing again once they're back.
export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isSignedIn) {
        action();
        return;
      }
      setModalOpen(true);
    },
    [isSignedIn]
  );

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      {modalOpen && <SignInModal onClose={() => setModalOpen(false)} />}
    </AuthGateContext.Provider>
  );
}

export function useRequireAuth() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useRequireAuth must be used within AuthGateProvider");
  return ctx.requireAuth;
}
