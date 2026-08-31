"use client";

import type { CafeEvent } from "@/lib/supabase";
import PanelShell from "@/components/PanelShell";

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type EventsPanelProps = {
  events: CafeEvent[];
  isAdmin: boolean;
  onAddClick: () => void;
  onDelete: (id: string) => void;
};

export default function EventsPanel({ events, isAdmin, onAddClick, onDelete }: EventsPanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.event_date >= today);

  return (
    <PanelShell
      title="Happening in Hyderabad 📅"
      subtitle={`${upcoming.length} upcoming`}
      headerAction={
        isAdmin && (
          <button
            onClick={onAddClick}
            className="rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
          >
            + Add
          </button>
        )
      }
    >
      {upcoming.length === 0 && (
        <div className="px-3 py-6 text-center text-sm text-neutral-400">
          {isAdmin ? "No events yet. Add the first one." : "No events yet — check back soon."}
        </div>
      )}
      {upcoming.map((event) => (
        <div
          key={event.id}
          className="group flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-50 leading-none dark:bg-amber-950">
            <span className="text-[10px] font-medium text-amber-500 uppercase">
              {new Date(`${event.event_date}T00:00:00`).toLocaleDateString("en-IN", { month: "short" })}
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {new Date(`${event.event_date}T00:00:00`).getDate()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {event.name}
            </div>
            <div className="truncate text-xs text-neutral-400">
              {formatDate(event.event_date)}
              {event.location ? ` · ${event.location}` : ""}
            </div>
            {event.description && (
              <div className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                {event.description}
              </div>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => onDelete(event.id)}
              className="shrink-0 rounded-full p-1.5 text-neutral-300 opacity-100 hover:bg-neutral-200 hover:text-neutral-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-neutral-700"
              aria-label={`Delete ${event.name}`}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
                <path d="M5 6h10M8 6V4h4v2M6 6l.5 10h7l.5-10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </PanelShell>
  );
}
