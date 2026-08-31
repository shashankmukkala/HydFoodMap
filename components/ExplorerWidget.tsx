"use client";

type ExplorerWidgetProps = {
  visitedCount: number;
  /** Sidebar rail is icon-only — same DOM as expanded, just animated down
   *  via CSS, so collapse/expand stays one smooth transition instead of
   *  swapping between two different mounted components. */
  collapsed?: boolean;
};

export default function ExplorerWidget({ visitedCount, collapsed = false }: ExplorerWidgetProps) {
  return (
    <div
      title={collapsed ? `${visitedCount} cafes visited` : undefined}
      className={`flex items-center rounded-2xl bg-neutral-50 ring-1 ring-neutral-100 transition-all duration-300 ease-in-out dark:bg-neutral-800/60 dark:ring-neutral-800 ${
        collapsed ? "justify-center gap-0 px-2 py-3" : "justify-between gap-2 p-3.5"
      }`}
    >
      <span
        className={`flex min-w-0 items-center overflow-hidden transition-all duration-300 ease-in-out ${
          collapsed ? "max-w-0 gap-0 opacity-0" : "max-w-[140px] gap-2 opacity-100"
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm dark:bg-neutral-900">
          🧭
        </span>
        <span className="overflow-hidden text-xs font-semibold whitespace-nowrap tracking-wide text-neutral-500 dark:text-neutral-400">
          Cafes visited
        </span>
      </span>
      <span
        className={`shrink-0 font-semibold tabular-nums text-neutral-900 transition-all duration-300 ease-in-out dark:text-neutral-50 ${
          collapsed ? "text-sm" : "text-xl"
        }`}
      >
        {visitedCount}
      </span>
    </div>
  );
}
