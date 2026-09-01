"use client";

import { useState } from "react";
import type { CafeEvent } from "@/lib/supabase";

type PlaceEventFormProps = {
  onCancel: () => void;
  onCreated: (event: CafeEvent) => void;
};

export default function PlaceEventForm({ onCancel, onCreated }: PlaceEventFormProps) {
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !eventDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          event_date: eventDate,
          location: location || null,
          description: description || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const event: CafeEvent = await res.json();
      onCreated(event);
    } catch {
      setError("Couldn't save this event. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
      <form
        onSubmit={handleSubmit}
        className="w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-white p-5 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100"
      >
        <h2 className="text-base font-semibold">Add an event</h2>
        <p className="mt-0.5 text-xs text-neutral-400">Workshops, pop-ups, meetups — anything happening in Hyderabad.</p>

        <label className="mt-4 block text-xs font-medium text-neutral-600 dark:text-neutral-300">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder="Latte Art Workshop"
        />

        <label className="mt-3 block text-xs font-medium text-neutral-600 dark:text-neutral-300">Date</label>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800"
        />

        <label className="mt-3 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
          Location (optional)
        </label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder="Roastery House, Jubilee Hills"
        />

        <label className="mt-3 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder="What's happening, who it's for..."
        />

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-neutral-400 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim() || !eventDate}
            className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Add event"}
          </button>
        </div>
      </form>
    </div>
  );
}
