"use client";

import { useNotifications } from "@/lib/useNotifications";
import ConfettiBurst from "@/components/ConfettiBurst";

// A 'welcome_bonus' notification (auto-created by handle_new_user(),
// 0028) is celebratory, not just informational — it gets its own modal
// instead of sitting quietly in the bell dropdown with everything else.
// Any *other* unread notification of this type (e.g. a signup during a
// later, different welcome-bonus window — not possible today since
// signup only fires the trigger once, but kept general rather than
// hardcoding "the first one ever") would show the same way.
export default function WelcomeBonusCard() {
  const { notifications, markRead } = useNotifications();
  const unseen = notifications.find((n) => n.type === "welcome_bonus" && !n.readAt);

  if (!unseen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
      <ConfettiBurst />
      <div className="panel-elevated w-full max-w-sm rounded-3xl p-6 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="mt-2 text-lg font-semibold text-neutral-100">Welcome bonus!</h2>
        <p className="mt-1 text-sm text-neutral-300">
          You got <span className="font-semibold text-amber-400">{unseen.amount ?? 0} points</span>
        </p>
        {unseen.message && <p className="mt-2 text-xs text-neutral-400">{unseen.message}</p>}
        <button
          type="button"
          onClick={() => markRead(unseen.id)}
          className="mt-4 w-full rounded-full bg-amber-500 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          Nice!
        </button>
      </div>
    </div>
  );
}
