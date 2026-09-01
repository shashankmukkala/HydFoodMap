"use client";

import { useState } from "react";
import type { Billboard } from "@/lib/supabase";
import PanelShell from "@/components/PanelShell";
import { useReverseGeocode } from "@/lib/useReverseGeocode";

type PlaceBillboardFormProps = {
  coords: { lng: number; lat: number };
  onCancel: () => void;
  onCreated: (billboard: Billboard) => void;
};

export default function PlaceBillboardForm({ coords, onCancel, onCreated }: PlaceBillboardFormProps) {
  const { address, status: addressStatus } = useReverseGeocode(coords);

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
    <PanelShell title="Place a billboard" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="px-2 pb-2">
        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-800/60">
          {addressStatus === "loading" && <span className="text-neutral-400">Locating…</span>}
          {addressStatus === "error" && (
            <span className="text-amber-600 dark:text-amber-400">
              Couldn&apos;t resolve a real address for this point — drag the pin on the map to adjust it
              before saving.
            </span>
          )}
          {addressStatus === "idle" && address && (
            <>
              <span className="font-medium text-neutral-700 dark:text-neutral-200">{address}</span>
              <div className="mt-0.5 text-neutral-400">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · drag the pin on the map to adjust
              </div>
            </>
          )}
        </div>

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
            className="rounded-md px-3 py-2 text-sm text-neutral-400 hover:bg-white/10"
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
    </PanelShell>
  );
}
