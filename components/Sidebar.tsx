"use client";

import { useState } from "react";
import ExplorerWidget from "@/components/ExplorerWidget";
import PointsWidget from "@/components/PointsWidget";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export type FeedTab = "billboards" | "saved" | "visited" | "collections" | null;

type SidebarProps = {
  activeTab: FeedTab;
  onSelectTab: (tab: FeedTab) => void;
  onExplore: () => void;
  /** Billboards are a paid ad product, not something visitors browse — admin-only. */
  showBillboards?: boolean;
  visitedCount: number;
  /** Mobile only: whether the drawer is open. Ignored at the lg breakpoint, where the rail is always visible. */
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const SIDEBAR_TRANSITION = "transition-all duration-300 ease-in-out";

const BASE_NAV_ITEMS: { tab: FeedTab; label: string; icon: React.ReactNode }[] = [
  {
    tab: null,
    label: "Explore Map",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9l-2 6-6 2 2-6 6-2z" />
      </svg>
    ),
  },
];

const BILLBOARDS_NAV_ITEM = {
  tab: "billboards" as FeedTab,
  label: "Billboards",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <rect x="3" y="5" width="14" height="9" rx="1.5" />
      <path d="M8 18l1.5-4M14 18l-1.5-4" />
      <path d="M17 8l4-2v7l-4-2" />
    </svg>
  ),
};

const TAIL_NAV_ITEMS: { tab: FeedTab; label: string; icon: React.ReactNode }[] = [
  {
    tab: "saved",
    label: "Favourites",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <path d="M12 20s-7-4.4-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.6-9.5 9-9.5 9z" />
      </svg>
    ),
  },
  {
    tab: "visited",
    label: "Visited",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    tab: "collections",
    label: "Collections",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <path d="M4 6h6l2 2h8v10H4V6z" />
      </svg>
    ),
  },
];

export default function Sidebar({
  activeTab,
  onSelectTab,
  onExplore,
  showBillboards = false,
  visitedCount,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(showBillboards ? [BILLBOARDS_NAV_ITEM] : []),
    ...TAIL_NAV_ITEMS,
  ];

  // `forceExpanded` is used for the mobile drawer, which always renders the
  // full (non-collapsed) layout regardless of the desktop rail's state.
  function renderBrand(forceExpanded: boolean) {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <div className="mb-5 flex items-center gap-2.5 px-0.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M4 9h13a3 3 0 0 1 0 6h-1" />
            <path d="M4 9v7a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9" />
            <path d="M8 3c0 1-1 1-1 2s1 1 1 2M12 3c0 1-1 1-1 2s1 1 1 2" />
          </svg>
        </span>
        <div
          className={`overflow-hidden ${SIDEBAR_TRANSITION} ${
            isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
          }`}
        >
          <div className="truncate text-[15px] font-semibold whitespace-nowrap tracking-tight text-neutral-900 dark:text-neutral-100">
            HydCafeMap
          </div>
        </div>
      </div>
    );
  }

  function renderNav(forceExpanded: boolean) {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = item.tab === activeTab;
          return (
            <button
              key={item.label}
              title={isCollapsed ? item.label : undefined}
              onClick={() => {
                if (item.tab === null) onExplore();
                else onSelectTab(item.tab);
                onMobileClose();
              }}
              className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium ${SIDEBAR_TRANSITION} ${
                isActive
                  ? "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/70 dark:hover:text-neutral-100"
              }`}
            >
              <span className={`shrink-0 ${isActive ? "text-amber-500 dark:text-amber-400" : ""}`}>{item.icon}</span>
              <span
                className={`overflow-hidden whitespace-nowrap ${SIDEBAR_TRANSITION} ${
                  isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    );
  }

  // Fixed-height row always — only the text inside crossfades/shrinks via
  // max-width+opacity. An earlier version collapsed the row's own height
  // (grid-template-rows 1fr -> 0fr), which shifted the widgets above it
  // during the animation instead of just fading text in place.
  function renderFooter(forceExpanded: boolean) {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <div className="flex justify-center overflow-hidden pt-3">
        <span
          className={`text-center text-[10px] whitespace-nowrap text-neutral-400 ${SIDEBAR_TRANSITION} ${
            isCollapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
          }`}
        >
          Made with ♥ for Hyderabad
        </span>
      </div>
    );
  }

  const desktopContent = (
    <>
      {renderBrand(false)}
      {renderNav(false)}

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <ExplorerWidget visitedCount={visitedCount} collapsed={collapsed} />
        <PointsWidget collapsed={collapsed} />
        {renderFooter(false)}
      </div>
    </>
  );

  const mobileContent = (
    <>
      {renderBrand(true)}
      {renderNav(true)}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <ExplorerWidget visitedCount={visitedCount} />
        <PointsWidget />
        {renderFooter(true)}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop rail — the collapse toggle lives outside the scrollable
          <aside> so it isn't clipped (an element with overflow-y set but
          not overflow-x still gets its horizontal overflow auto-clipped
          per spec, which cut the button off and drew a phantom scrollbar).
          Every piece of content inside stays mounted across collapse/expand
          and animates via the same duration/easing as the rail itself —
          swapping different components in and out mid-animation is what
          caused the jump/glitch this replaces. Padding stays constant too
          (only width changes) so nothing inside reflows vertically. */}
      <div className={`relative hidden h-full shrink-0 lg:block ${SIDEBAR_TRANSITION} ${collapsed ? "w-[76px]" : "w-64"}`}>
        <aside className="panel-elevated flex h-full w-full flex-col gap-1 overflow-y-auto overflow-x-hidden rounded-2xl bg-white/95 p-3.5 backdrop-blur dark:bg-neutral-900/95">
          {desktopContent}
        </aside>
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-4 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm hover:text-amber-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 transition-transform duration-300 ease-in-out ${collapsed ? "rotate-180" : ""}`}
          >
            <path d="M12 5l-5 5 5 5" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col gap-1 bg-white p-4 lg:hidden dark:bg-neutral-900">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {mobileContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
