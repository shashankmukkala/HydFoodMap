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
      className={`flex items-center rounded-2xl bg-paper ring-1 ring-line transition-all duration-300 ease-in-out ${
        collapsed ? "justify-center gap-0 px-2 py-3" : "justify-between gap-2 p-3.5"
      }`}
    >
      <span
        className={`flex min-w-0 items-center overflow-hidden transition-all duration-300 ease-in-out ${
          collapsed ? "max-w-0 gap-0 opacity-0" : "max-w-[140px] gap-2 opacity-100"
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm">
          🧭
        </span>
        <span className="overflow-hidden text-xs font-semibold whitespace-nowrap tracking-wide text-ink-muted">
          Cafes visited
        </span>
      </span>
      <span
        className={`shrink-0 font-semibold tabular-nums text-ink transition-all duration-300 ease-in-out ${
          collapsed ? "text-sm" : "text-xl"
        }`}
      >
        {visitedCount}
      </span>
    </div>
  );
}
