"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import SignInModal from "@/components/SignInModal";

type AuthGateContextValue = {
  requireAuth: (action: () => void) => void;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isSignedIn) {
        action();
        return;
      }
      pendingAction.current = action;
      setModalOpen(true);
    },
    [isSignedIn]
  );

  function handleSignedIn() {
    setModalOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  }

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      {modalOpen && (
        <SignInModal
          onClose={() => {
            pendingAction.current = null;
            setModalOpen(false);
          }}
          onSignedIn={handleSignedIn}
        />
      )}
    </AuthGateContext.Provider>
  );
}

export function useRequireAuth() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useRequireAuth must be used within AuthGateProvider");
  return ctx.requireAuth;
}
