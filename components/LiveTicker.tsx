"use client";

import type { CafeEvent } from "@/lib/supabase";

type LiveTickerProps = {
  events: CafeEvent[];
};

export default function LiveTicker({ events }: LiveTickerProps) {
  const today = new Date().toISOString().slice(0, 10);
  const activeEvents = events
    .filter((event) => event.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 8);

  if (activeEvents.length === 0) return null;

  const isSingle = activeEvents.length === 1;
  const items = isSingle ? activeEvents : [...activeEvents, ...activeEvents];

  return (
    <div className="live-ticker panel-elevated flex min-w-0 items-center overflow-hidden rounded-2xl px-3 py-2">
      <div className="live-ticker-label flex shrink-0 items-center gap-1.5 pr-3 text-[10px] font-bold tracking-[0.16em] text-rose-300 uppercase">
        <span className="live-dot" aria-hidden="true" />
        City broadcast
      </div>
      <div className="live-ticker-viewport min-w-0 flex-1 overflow-hidden">
        <div className={`live-ticker-track flex w-max items-center gap-8 ${isSingle ? "live-ticker-static" : ""}`}>
          {items.map((event, index) => (
            <span key={`${event.id}-${index}`} className="flex items-center gap-2 text-xs text-neutral-200">
              <span className="text-amber-300">{event.event_date === today ? "LIVE" : "UPCOMING"}</span>
              <span className="max-w-64 truncate font-semibold">{event.name}</span>
              {event.location && <span className="text-neutral-500">· {event.location}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
