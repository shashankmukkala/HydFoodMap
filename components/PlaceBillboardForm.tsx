"use client";

import { useState } from "react";
import type { Billboard } from "@/lib/supabase";

type PlaceBillboardFormProps = {
  coords: { lng: number; lat: number };
  onCancel: () => void;
  onCreated: (billboard: Billboard) => void;
};

export default function PlaceBillboardForm({ coords, onCancel, onCreated }: PlaceBillboardFormProps) {
  const [name, setName] = useState("");
  const [widthM, setWidthM] = useState(10);
  const [heightM, setHeightM] = useState(5);
  const [headingDeg, setHeadingDeg] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/billboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          lng: coords.lng,
          lat: coords.lat,
          width_m: widthM,
          height_m: heightM,
          heading_deg: headingDeg,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const billboard: Billboard = await res.json();
      onCreated(billboard);
    } catch {
      setError("Couldn't save this billboard. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30">
      <form onSubmit={handleSubmit} className="w-80 rounded-xl bg-white p-5 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100">
        <h2 className="text-base font-semibold">Place a billboard</h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>

        <label className="mt-4 block text-xs font-medium text-neutral-600">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Weekend Sale"
        />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-neutral-600">Width (m)</label>
            <input
              type="number"
              min={1}
              value={widthM}
              onChange={(e) => setWidthM(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600">Height (m)</label>
            <input
              type="number"
              min={1}
              value={heightM}
              onChange={(e) => setHeightM(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600">Heading (°)</label>
            <input
              type="number"
              value={headingDeg}
              onChange={(e) => setHeadingDeg(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Place billboard"}
          </button>
        </div>
      </form>
    </div>
  );
}
