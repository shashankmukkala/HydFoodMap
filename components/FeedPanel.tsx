"use client";

import type { Billboard, Cafe } from "@/lib/supabase";
import { CATEGORY_ICONS, CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import PanelShell from "@/components/PanelShell";

function cafeIcon(cafe: Cafe) {
  if (cafe.category && cafe.category in CATEGORY_ICONS) return CATEGORY_ICONS[cafe.category as Category];
  return "☕";
}

function shortCategory(category: string) {
  return category in CATEGORY_SHORT_LABELS ? CATEGORY_SHORT_LABELS[category as Category] : category;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type FeedPanelProps =
  | { kind: "cafe"; title: string; icon: string; emptyLabel: string; items: Cafe[]; onSelect: (cafe: Cafe) => void; onClose: () => void }
  | {
      kind: "billboard";
      title: string;
      icon: string;
      emptyLabel: string;
      items: Billboard[];
      onSelect: (billboard: Billboard) => void;
      onClose: () => void;
    };

export default function FeedPanel(props: FeedPanelProps) {
  const { kind, title, icon, emptyLabel, items, onClose } = props;

  return (
    <PanelShell title={title} subtitle={`${items.length} pinned`} onClose={onClose}>
      {items.length === 0 && (
        <div className="px-3 py-6 text-center text-sm text-neutral-400">{emptyLabel}</div>
      )}
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => (kind === "cafe" ? props.onSelect(item as Cafe) : props.onSelect(item as Billboard))}
          className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <span className="text-lg leading-none">{kind === "cafe" ? cafeIcon(item as Cafe) : icon}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{item.name}</div>
            <div className="truncate text-xs text-neutral-400">
              {kind === "cafe" && (item as Cafe).category ? `${shortCategory((item as Cafe).category!)} · ` : ""}
              {timeAgo(item.created_at)}
            </div>
          </div>
        </button>
      ))}
    </PanelShell>
  );
}
