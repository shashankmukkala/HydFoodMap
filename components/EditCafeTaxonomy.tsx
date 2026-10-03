"use client";

import { useRef, useState } from "react";
import type { Cafe } from "@/lib/supabase";
import { CATEGORY_OPTIONS, CATEGORY_SHORT_LABELS } from "@/lib/categories";
import { TAG_GROUPS, type Tag } from "@/lib/tags";
import { readAsDataUrl } from "@/lib/readAsDataUrl";

type Props = {
  cafe: Cafe;
  /** The admin console's own session token (lib/useAdminAuth) — this
   *  component only ever renders for an admin, but it's mounted inside
   *  DetailCard/MapExperience, which are shared with the public site, so
   *  it can't call useAdminAuth itself without also mounting the admin
   *  Supabase client's listeners on every public page load. Threaded down
   *  from MapExperience instead. */
  accessToken: string | null;
  onSaved: (cafe: Cafe) => void;
};

const MAX_PHOTO_DATA_LENGTH = 1_500_000;

// Admin-only: lets an operator correct a cafe's photo, category, and tags
// directly from the map, writing straight to `cafes` (app/api/cafes/[id],
// PATCH) — no separate approval step, since this is metadata correction,
// not content moderation. Every visitor reads the same `cafes` row, so a
// save here shows up on the public map immediately. The photo upload is
// exactly the same "attach an image file" flow ReviewsSection uses for
// review photos — an embedded data: URL, not a Supabase Storage upload,
// same as everywhere else in this app that lets someone attach an image.
export default function EditCafeTaxonomy({ cafe, accessToken, onSaved }: Props) {
  const [category, setCategory] = useState<string>(cafe.category ?? "");
  const [tags, setTags] = useState<Set<string>>(new Set(cafe.tags));
  const [imageUrl, setImageUrl] = useState<string | null>(cafe.image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dirty =
    category !== (cafe.category ?? "") ||
    imageUrl !== (cafe.image_url ?? null) ||
    tags.size !== cafe.tags.length ||
    [...tags].some((t) => !cafe.tags.includes(t));

  function toggleTag(tag: Tag) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await readAsDataUrl(file);
      if (dataUrl.length > MAX_PHOTO_DATA_LENGTH) {
        setError("Photo must be under 1 MB.");
        return;
      }
      setImageUrl(dataUrl);
    } catch {
      setError("Couldn't read that file.");
    }
  }

  async function save() {
    if (!accessToken || !dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cafes/${cafe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ category: category || null, tags: [...tags], image_url: imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save changes.");
      onSaved(data as Cafe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-line px-4 py-3">
      <div className="text-xs font-semibold text-ink-muted">Edit photo, category & tags (admin)</div>

      <div className="mt-2 flex items-center gap-2.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-lamp/15">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg text-ink-muted">☕</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-dashed border-line-strong px-2.5 py-1.5 text-[11px] text-ink-muted hover:border-ink hover:text-lamp-ink"
          >
            {imageUrl ? "Replace photo" : "📸 Upload a photo"}
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="text-left text-[11px] text-ink-muted hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="mt-3 w-full rounded-md border border-line bg-transparent px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
      >
        <option value="">No category</option>
        {CATEGORY_OPTIONS.map((option) => (
          <option key={option} value={option} className="text-ink">
            {CATEGORY_SHORT_LABELS[option]}
          </option>
        ))}
      </select>

      <div className="mt-2.5 space-y-2">
        {TAG_GROUPS.map((group) => (
          <div key={group.key}>
            <div className="mb-1 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">{group.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    tags.has(tag)
                      ? "bg-ink text-white"
                      : "bg-ink/5 text-ink-muted hover:bg-ink/10"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={!dirty || saving}
        className="mt-2.5 w-full rounded-md bg-ink py-1.5 text-xs font-medium text-white hover:bg-ink/85 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
