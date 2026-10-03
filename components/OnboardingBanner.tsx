"use client";

import { useOnboarding } from "@/lib/useOnboarding";

// Shown once, on first visit. The map alone doesn't communicate what makes
// it different from Maps/Zomato — that reviews here require the reviewer
// to have actually been at the cafe — so it has to be said outright before
// someone reads a review and just assumes it's the usual unverified kind.
export default function OnboardingBanner() {
  const { dismissed, dismiss } = useOnboarding();
  if (dismissed) return null;

  return (
    <div className="panel-elevated pointer-events-auto flex items-start gap-3 rounded-3xl px-4 py-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lamp/15 text-sm">
        📍
      </span>
      <div className="min-w-0 flex-1 text-xs text-ink-muted">
        <span className="font-semibold text-ink">Reviews here are verified.</span>{" "}
        You can only post one after your phone confirms you&apos;re actually at the cafe — no copied ratings, no
        reviews from people who never went.
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-ink-muted hover:bg-ink/5 hover:text-ink"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
