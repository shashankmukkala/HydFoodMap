"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/lib/supabase";

export type Notification = {
  id: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  type: string;
  amount: number | null;
};

type NotificationRow = {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  type: string;
  amount: number | null;
};

// Per-account via the `notifications` table (0027_notifications.sql) —
// written server-side only (e.g. app/api/admin/users/[userId]/bonus-points),
// this hook just reads/marks-read. Polls on an interval rather than a
// realtime subscription since this app doesn't otherwise use Supabase
// Realtime — simplest thing that actually surfaces a new notification
// without requiring a page reload.
export function useNotifications() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Clears the moment the signed-in identity changes (most notably
  // sign-out) — adjusted during render (React's recommended pattern for
  // state driven by a prop/value), not in the effect below, which can't
  // set state synchronously in its body.
  const currentUserId = session?.user.id ?? null;
  const [lastUserId, setLastUserId] = useState(currentUserId);
  if (currentUserId !== lastUserId) {
    setLastUserId(currentUserId);
    setNotifications([]);
  }

  const load = useCallback(() => {
    if (!session) return;
    return supabase
      .from("notifications")
      .select("id, message, created_at, read_at, type, amount")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data) return;
        setNotifications(
          (data as NotificationRow[]).map((row) => ({
            id: row.id,
            message: row.message,
            createdAt: row.created_at,
            readAt: row.read_at,
            type: row.type,
            amount: row.amount,
          }))
        );
      });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    load();
    const interval = setInterval(() => {
      if (!cancelled) load();
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, load]);

  const markRead = useCallback(
    (id: string) => {
      if (!session) return;
      setNotifications((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
      supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", session.user.id)
        .then(() => {});
    },
    [session]
  );

  const markAllRead = useCallback(() => {
    if (!session) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", session.user.id)
      .is("read_at", null)
      .then(() => {});
  }, [session]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return { notifications, unreadCount, markRead, markAllRead };
}
