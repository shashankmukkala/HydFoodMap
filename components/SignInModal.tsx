"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/useAuth";

type SignInModalProps = {
  onClose: () => void;
};

export default function SignInModal({ onClose }: SignInModalProps) {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleGoogleSignIn() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error } = await signInWithGoogle();
    // On success the browser navigates away to Google immediately, so
    // this only ever reaches here on failure.
    setBusy(false);
    if (error) setError(error);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign up or sign in</DialogTitle>
          <DialogDescription>
            Browsing is free. Saving, reviewing, and marking visits needs a Google account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          {error && <p className="text-[11px] text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
          >
            <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.9 32.9 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6 29.5 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.4 35.4 26.8 36 24 36c-5.4 0-9.8-3.1-11.3-7.4l-6.5 5C9.5 39.5 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C40.9 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"
              />
            </svg>
            {busy ? "Redirecting…" : "Continue with Google"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
