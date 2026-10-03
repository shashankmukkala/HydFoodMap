"use client";

import { useEffect, useRef, useState } from "react";
import { useNotifications } from "@/lib/useNotifications";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="notifications-bell relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink hover:bg-ink/10"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unreadCount > 0 && <span className="notifications-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notifications-dropdown panel-elevated absolute top-full right-0 z-20 mt-2 max-h-[70vh] w-80 max-w-[85vw] overflow-y-auto rounded-2xl p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className="text-[11px] font-medium text-lamp-ink hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-1 py-3 text-xs text-ink-muted">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className={`w-full rounded-xl px-2.5 py-2 text-left text-xs leading-snug ${
                      n.readAt ? "text-ink-muted" : "bg-lamp/15 text-ink"
                    }`}
                  >
                    <span>{n.message}</span>
                    <span className="mt-0.5 block text-[10px] text-ink-muted">{timeAgo(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
