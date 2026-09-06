"use client";

import { useState } from "react";
import type { Cafe } from "@/lib/supabase";
import { TAG_GROUPS, TAG_ICONS } from "@/lib/tags";
import { CATEGORY_ICONS, CATEGORY_OPTIONS, CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import PanelShell from "@/components/PanelShell";
import { useReverseGeocode } from "@/lib/useReverseGeocode";

type PlaceCafeFormProps = {
  coords: { lng: number; lat: number };
  onCancel: () => void;
  onCreated: (cafe: Cafe) => void;
};

export default function PlaceCafeForm({ coords, onCancel, onCreated }: PlaceCafeFormProps) {
  const { address, status: addressStatus } = useReverseGeocode(coords);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [location, setLocation] = useState("");
  const [costForTwo, setCostForTwo] = useState("");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [hoursText, setHoursText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/cafes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: category || null,
          location: location || null,
          address: address || null,
          cost_for_two: costForTwo || null,
          note: note || null,
          lng: coords.lng,
          lat: coords.lat,
          image_url: imageUrl || null,
          hours_text: hoursText || null,
          tags,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const cafe: Cafe = await res.json();
      onCreated(cafe);
    } catch {
      setError("Couldn't save this cafe. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PanelShell title="Pin a cafe" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="px-2 pb-2">
        <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-800/60">
          {addressStatus === "loading" && <span className="text-neutral-400">Locating…</span>}
          {addressStatus === "error" && (
            <span className="text-amber-600 dark:text-amber-400">
              Couldn&apos;t resolve a real address for this point — drag the pin on the map onto the
              cafe&apos;s actual building before saving.
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
          placeholder="Roastery Coffee House"
        />

        <label className="mt-3 block text-xs font-medium text-neutral-600">Category</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory((prev) => (prev === option ? "" : option))}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === option
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {CATEGORY_ICONS[option]} {CATEGORY_SHORT_LABELS[option]}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-neutral-600">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Jubilee Hills"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600">Budget for two</label>
            <input
              value={costForTwo}
              onChange={(e) => setCostForTwo(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="₹800"
            />
          </div>
        </div>

        <label className="mt-3 block text-xs font-medium text-neutral-600">Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Great for laptop work, quiet mornings..."
        />

        <label className="mt-3 block text-xs font-medium text-neutral-600">Photo URL (optional)</label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="https://..."
        />

        <label className="mt-3 block text-xs font-medium text-neutral-600">Hours (optional)</label>
        <input
          value={hoursText}
          onChange={(e) => setHoursText(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="8:00 AM – 11:30 PM"
        />

        <label className="mt-3 block text-xs font-medium text-neutral-600">Tags</label>
        <div className="mt-1.5 space-y-2">
          {TAG_GROUPS.map((group) => (
            <div key={group.key}>
              <div className="mb-1 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      tags.includes(tag)
                        ? "bg-amber-500 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {TAG_ICONS[tag]} {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
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
            {submitting ? "Saving…" : "Pin cafe"}
          </button>
        </div>
      </form>
    </PanelShell>
  );
}
