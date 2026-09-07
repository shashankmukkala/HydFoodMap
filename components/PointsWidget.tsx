"use client";

import { useEffect, useRef, useState } from "react";
import { usePoints } from "@/lib/usePoints";
import type { PointsConfigEntry } from "@/app/api/points-config/route";

const EARN_ROW_META: Record<PointsConfigEntry["action"], { icon: string; label: string }> = {
  review: { icon: "📍", label: "Post a review — verified from the cafe" },
  visit: { icon: "🚶", label: "Verify a visit (first time)" },
  photo: { icon: "📸", label: "Add a photo to your review" },
  repeat_visit: { icon: "🔁", label: "Verify a return visit" },
};

type PointsWidgetProps = {
  /** Sidebar rail is icon-only — same DOM, just animates down via CSS so
   *  the collapse/expand stays a single smooth transition instead of a
   *  swap between two different mounted components. */
  collapsed?: boolean;
};

export default function PointsWidget({ collapsed = false }: PointsWidgetProps) {
  const { points } = usePoints();
  const [open, setOpen] = useState(false);
  const [earnRows, setEarnRows] = useState<PointsConfigEntry[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || earnRows.length > 0) return;
    fetch("/api/points-config")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setEarnRows(data))
      .catch(() => {});
  }, [open, earnRows.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? `${points} points` : undefined}
        className={`points-widget flex w-full items-center rounded-2xl text-left transition-all duration-300 ease-in-out ${
          collapsed ? "justify-center gap-0 px-2 py-3" : "justify-between gap-2 p-3.5"
        }`}
      >
        <span
          className={`flex min-w-0 items-center overflow-hidden transition-all duration-300 ease-in-out ${
            collapsed ? "max-w-0 gap-0 opacity-0" : "max-w-[140px] gap-2 opacity-100"
          }`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm dark:bg-neutral-900">
            🎁
          </span>
          <span className="overflow-hidden text-xs font-semibold whitespace-nowrap text-amber-700 dark:text-amber-300">
            Your points
          </span>
        </span>
        <span
          className={`shrink-0 font-semibold tabular-nums text-neutral-900 transition-all duration-300 ease-in-out dark:text-neutral-50 ${
            collapsed ? "text-sm" : "text-xl"
          }`}
        >
          {points}
        </span>
      </button>

      {open && (
        <div className="panel-elevated absolute bottom-full left-0 z-30 mb-2 w-60 max-w-[80vw] rounded-2xl p-3.5 text-xs text-neutral-600 dark:text-neutral-300">
          <div className="mb-2 text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
            Earn points as you go
          </div>
          <ul className="space-y-1.5">
            {earnRows.map((row) => (
              <li key={row.action} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                  <span>{EARN_ROW_META[row.action].icon}</span>
                  {EARN_ROW_META[row.action].label}
                </span>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:bg-amber-950 dark:text-amber-300">
                  +{row.amount}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2.5 border-t border-neutral-100 pt-2.5 text-[11px] font-medium text-amber-600 dark:border-neutral-800 dark:text-amber-400">
            Redeem for exciting offers, coming soon!
          </div>
        </div>
      )}
    </div>
  );
}
