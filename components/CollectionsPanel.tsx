"use client";

import { useState } from "react";
import type { Cafe } from "@/lib/supabase";
import type { Collection } from "@/lib/useCollections";
import { CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import PanelShell from "@/components/PanelShell";

function shortCategory(category: string) {
  return category in CATEGORY_SHORT_LABELS ? CATEGORY_SHORT_LABELS[category as Category] : category;
}

type CollectionsPanelProps = {
  collections: Collection[];
  cafes: Cafe[];
  onSelectCafe: (cafe: Cafe) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export default function CollectionsPanel({
  collections,
  cafes,
  onSelectCafe,
  onCreate,
  onDelete,
  onClose,
}: CollectionsPanelProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const open = collections.find((c) => c.id === openId) ?? null;

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreate(newName);
    setNewName("");
  }

  if (open) {
    const openCafes = open.cafeIds
      .map((id) => cafes.find((c) => c.id === id))
      .filter((c): c is Cafe => !!c);

    return (
      <PanelShell
        title={open.name}
        subtitle={`${openCafes.length} ${openCafes.length === 1 ? "cafe" : "cafes"}`}
        headerAction={
          <button
            onClick={() => setOpenId(null)}
            className="rounded-full p-1.5 text-ink-muted hover:bg-ink/5"
            aria-label="Back to collections"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        }
        onClose={onClose}
      >
        {openCafes.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-ink-muted">
            No cafes in this collection yet. Add one from a cafe&apos;s detail card.
          </div>
        )}
        {openCafes.map((cafe) => (
          <button
            key={cafe.id}
            onClick={() => onSelectCafe(cafe)}
            className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ink/5"
          >
            <span className="text-lg leading-none">☕</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">
                {cafe.name}
              </div>
              {cafe.category && (
                <div className="truncate text-xs text-ink-muted">{shortCategory(cafe.category)}</div>
              )}
            </div>
          </button>
        ))}
      </PanelShell>
    );
  }

  return (
    <PanelShell
      title="Collections"
      subtitle={`${collections.length} lists`}
      onClose={onClose}
      footer={
        <form onSubmit={submitNew} className="flex gap-1.5 border-t border-line p-2.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New collection name…"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-ink/85 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      }
    >
      {collections.length === 0 && (
        <div className="px-3 py-6 text-center text-sm text-ink-muted">
          No collections yet. Create one below, or start one from a cafe&apos;s detail card.
        </div>
      )}
      {collections.map((collection) => (
        <div
          key={collection.id}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-ink/5"
        >
          <button onClick={() => setOpenId(collection.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lamp/15 text-base">
              📁
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">
                {collection.name}
              </div>
              <div className="text-xs text-ink-muted">
                {collection.cafeIds.length} {collection.cafeIds.length === 1 ? "cafe" : "cafes"}
              </div>
            </div>
          </button>
          <button
            onClick={() => onDelete(collection.id)}
            className="shrink-0 rounded-full p-1.5 text-ink-muted opacity-100 hover:bg-ink/5 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={`Delete ${collection.name}`}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
              <path d="M5 6h10M8 6V4h4v2M6 6l.5 10h7l.5-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ))}
    </PanelShell>
  );
}
