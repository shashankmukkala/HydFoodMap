"use client";

import { createPortal } from "react-dom";
import { useNotifications } from "@/lib/useNotifications";
import ConfettiBurst from "@/components/ConfettiBurst";

// A 'welcome_bonus' notification (auto-created by handle_new_user(),
// 0028) is celebratory, not just informational — it gets its own modal
// instead of sitting quietly in the bell dropdown with everything else.
// Any *other* unread notification of this type (e.g. a signup during a
// later, different welcome-bonus window — not possible today since
// signup only fires the trigger once, but kept general rather than
// hardcoding "the first one ever") would show the same way.
//
// Mounted from inside TopBar, whose parent (.topbar-shell) uses
// backdrop-filter: blur(...) — in every modern browser that creates a
// new containing block for `position: fixed` descendants, so this
// "full-screen centered" overlay was actually only centering itself
// within the top bar's own thin box, landing near the top of the screen
// instead of the real viewport center. Portaling straight to <body>
// escapes that ancestor entirely. No SSR guard needed for
// document.body here — TopBar only ever adds this component to the
// tree once isSignedIn resolves client-side, so it never renders during
// the initial server-rendered pass.
export default function WelcomeBonusCard() {
  const { notifications, markRead } = useNotifications();
  const unseen = notifications.find((n) => n.type === "welcome_bonus" && !n.readAt);

  if (!unseen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/40 px-4">
      <ConfettiBurst />
      <div className="panel-elevated w-full max-w-sm rounded-3xl p-6 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="mt-2 text-lg font-semibold text-ink">Welcome bonus!</h2>
        <p className="mt-1 text-sm text-ink-muted">
          You got <span className="font-semibold text-lamp-ink">{unseen.amount ?? 0} points</span>
        </p>
        {unseen.message && <p className="mt-2 text-xs text-ink-muted">{unseen.message}</p>}
        <button
          type="button"
          onClick={() => markRead(unseen.id)}
          className="mt-4 w-full rounded-full bg-ink py-2 text-sm font-medium text-white hover:bg-ink/85"
        >
          Nice!
        </button>
      </div>
    </div>,
    document.body
  );
}
