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
      onDelete?: (id: string) => void;
      onClose: () => void;
    };

export default function FeedPanel(props: FeedPanelProps) {
  const { kind, title, icon, emptyLabel, items, onClose } = props;

  return (
    <PanelShell title={title} subtitle={`${items.length} pinned`} onClose={onClose}>
      {items.length === 0 && (
        <div className="px-3 py-6 text-center text-sm text-ink-muted">{emptyLabel}</div>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="group flex w-full items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-ink/5"
        >
          <button
            onClick={() => (kind === "cafe" ? props.onSelect(item as Cafe) : props.onSelect(item as Billboard))}
            className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-1 py-1 text-left"
          >
            <span className="text-lg leading-none">{kind === "cafe" ? cafeIcon(item as Cafe) : icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
              <span className="block truncate text-xs text-ink-muted">
                {kind === "cafe" && (item as Cafe).category ? `${shortCategory((item as Cafe).category!)} · ` : ""}
                {timeAgo(item.created_at)}
              </span>
            </span>
          </button>
          {kind === "billboard" && props.onDelete && (
            <button
              onClick={() => props.onDelete?.(item.id)}
              aria-label={`Delete ${item.name}`}
              className="mt-1 shrink-0 rounded-full p-1.5 text-ink-muted opacity-60 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
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
