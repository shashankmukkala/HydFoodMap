"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ExplorerWidget from "@/components/ExplorerWidget";
import PointsWidget from "@/components/PointsWidget";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export type FeedTab = "saved" | "visited" | "collections" | null;

type SidebarProps = {
  activeTab: FeedTab;
  onSelectTab: (tab: FeedTab) => void;
  onExplore: () => void;
  /** Billboards are a paid ad product, not something visitors browse — admin-only. */
  showBillboards?: boolean;
  /** Public navigation is an on-demand drawer so the map can remain full-screen. */
  publicMode?: boolean;
  onPlaceCafe?: () => void;
  onPlaceBillboard?: () => void;
  onPlaceAircraft?: () => void;
  onPlaceRail?: () => void;
  visitedCount: number;
  /** Mobile only: whether the drawer is open. Ignored at the lg breakpoint, where the rail is always visible. */
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const SIDEBAR_TRANSITION = "transition-all duration-300 ease-in-out";

const EXPLORE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-2 6-6 2 2-6 6-2z" />
  </svg>
);

// Admin-only nav items are their own pages (/admin/...), not panels
// embedded in the map — mirrors USERS_NAV_ITEM's href+tab:null pattern.
const BILLBOARDS_NAV_ITEM = {
  tab: null as FeedTab,
  href: "/admin/billboards",
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

// Its own page (/leaderboard), not a feedTab panel — same href+tab:null
// pattern as USERS_NAV_ITEM.
const LEADERBOARD_NAV_ITEM = {
  tab: null as FeedTab,
  href: "/leaderboard",
  label: "Leaderboard",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" />
    </svg>
  ),
};

const AD_ENQUIRIES_NAV_ITEM = {
  tab: null as FeedTab,
  href: "/admin/ad-enquiries",
  label: "Ad enquiries",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M4 6h16v12H4zM7 10h6M7 14h10" />
    </svg>
  ),
};

// Not a feedTab — Users analytics is its own page (/admin/users), not a
// panel embedded in the map experience, so this is a real navigation link
// rather than something rendered via onSelectTab.
const USERS_NAV_ITEM = {
  tab: null as FeedTab,
  href: "/admin/users",
  label: "Users",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 8a3 3 0 1 1 0 6M20 20c0-2.5-1.8-4.6-4.2-5.4" />
    </svg>
  ),
};

const ANALYTICS_NAV_ITEM = {
  tab: null as FeedTab,
  href: "/admin/analytics",
  label: "Analytics",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <path d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  ),
};

export default function Sidebar({
  activeTab,
  onSelectTab,
  onExplore,
  showBillboards = false,
  publicMode = false,
  onPlaceCafe,
  onPlaceBillboard,
  onPlaceAircraft,
  onPlaceRail,
  visitedCount,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  // Admin isn't "exploring" the map the way a visitor browsing for a cafe
  // is — they're previewing what visitors see, so the label reflects
  // that instead of reusing the visitor-facing copy.
  const exploreItem = { tab: null as FeedTab, label: showBillboards ? "Preview" : "Explore Map", icon: EXPLORE_ICON };
  const navItems: { tab: FeedTab; label: string; icon: React.ReactNode; href?: string }[] = [
    exploreItem,
    ...(showBillboards ? [BILLBOARDS_NAV_ITEM] : []),
    ...(showBillboards ? [AD_ENQUIRIES_NAV_ITEM] : []),
    ...(showBillboards ? [USERS_NAV_ITEM] : []),
    ...(showBillboards ? [ANALYTICS_NAV_ITEM] : []),
    ...(!showBillboards ? TAIL_NAV_ITEMS : []),
    ...(!showBillboards ? [LEADERBOARD_NAV_ITEM] : []),
  ];

  // `forceExpanded` is used for the mobile drawer, which always renders the
  // full (non-collapsed) layout regardless of the desktop rail's state.
  //
  // The collapse/expand toggle sits inline here, beside the logo, in
  // BOTH the expanded and collapsed desktop states — not in a separate
  // row above it (that read as a stray floating element breaking the
  // panel's curve — see the -right-3 footgun this replaced earlier). The
  // collapsed rail is sized (see the w-[96px] on the rail below) with
  // enough room for the logo + toggle side by side at a tighter gap, so
  // this doesn't need special-casing per collapsed state the way it used
  // to. Never shown on the mobile drawer (forceExpanded), which closes
  // via the Sheet's own X instead.
  function renderBrand(forceExpanded: boolean) {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <div className="mb-5 flex items-center gap-2 px-0.5">
        {/* The mark links home — the cover is the one place that says what
            this is, and the drawer is where people look for a way back. */}
        <Link href="/" aria-label="HydCafeMap home" className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center">
          <Image src="/logo-mark.png" alt="" width={256} height={256} className="h-8 w-8" />
        </Link>
        <div
          className={`min-w-0 flex-1 overflow-hidden ${SIDEBAR_TRANSITION} ${
            isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
          }`}
        >
          <div className="display truncate text-[21px] leading-none whitespace-nowrap text-ink">
            HydCafeMap
          </div>
        </div>
        {!forceExpanded && collapseToggleButton()}
      </div>
    );
  }

  function renderNav(forceExpanded: boolean) {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = item.href ? false : item.tab === activeTab;
          const className = `group flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-medium ${SIDEBAR_TRANSITION} ${
            isActive ? "nav-item-active" : "text-ink-muted hover:bg-ink/5 hover:text-ink"
          }`;
          const content = (
            <>
              <span className={`shrink-0 ${isActive ? "nav-item-icon-active" : ""}`}>{item.icon}</span>
              <span
                className={`overflow-hidden whitespace-nowrap ${SIDEBAR_TRANSITION} ${
                  isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
                }`}
              >
                {item.label}
              </span>
            </>
          );
          if (item.href) {
            return (
              <Link key={item.label} href={item.href} title={isCollapsed ? item.label : undefined} onClick={onMobileClose} className={className}>
                {content}
              </Link>
            );
          }
          return (
            <button
              key={item.label}
              title={isCollapsed ? item.label : undefined}
              onClick={() => {
                if (item.tab === null) onExplore();
                else onSelectTab(item.tab);
                onMobileClose();
              }}
              className={className}
            >
              {content}
            </button>
          );
        })}
        {showBillboards && onPlaceBillboard && onPlaceAircraft && onPlaceRail && (
          <div className="mt-4 border-t border-line pt-3">
            <div className={`mb-1.5 px-3 text-[10px] font-semibold tracking-[0.16em] text-ink-muted uppercase ${isCollapsed ? "sr-only" : ""}`}>
              Ad placements
            </div>
            {onPlaceCafe && (
              <button
                onClick={() => {
                  onPlaceCafe();
                  onMobileClose();
                }}
                title={isCollapsed ? "Pin a cafe" : undefined}
                className="group flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <span className="shrink-0">☕</span>
                <span className={`overflow-hidden whitespace-nowrap ${SIDEBAR_TRANSITION} ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"}`}>
                  Pin a cafe
                </span>
              </button>
            )}
            <button
              onClick={() => {
                onPlaceBillboard();
                onMobileClose();
              }}
              title={isCollapsed ? "Place billboard" : undefined}
              className="group flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <span className="shrink-0">📢</span>
              <span className={`overflow-hidden whitespace-nowrap ${SIDEBAR_TRANSITION} ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"}`}>
                Place billboard
              </span>
            </button>
            <button
              onClick={() => {
                onPlaceRail();
                onMobileClose();
              }}
              title={isCollapsed ? "Place rail ad" : undefined}
              className="group flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <span className="shrink-0">▦</span>
              <span className={`overflow-hidden whitespace-nowrap ${SIDEBAR_TRANSITION} ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"}`}>
                Place rail ad
              </span>
            </button>
            <button
              onClick={() => {
                onPlaceAircraft();
                onMobileClose();
              }}
              title={isCollapsed ? "Aircraft banner" : undefined}
              className="group flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-[13.5px] font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <span className="shrink-0">✈</span>
              <span className={`overflow-hidden whitespace-nowrap ${SIDEBAR_TRANSITION} ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"}`}>
                Aircraft banner
              </span>
            </button>
          </div>
        )}
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
          className={`text-center text-[10px] whitespace-nowrap text-ink-muted ${SIDEBAR_TRANSITION} ${
            isCollapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
          }`}
        >
          Made with ♥ for Hyderabad
        </span>
      </div>
    );
  }

  function collapseToggleButton() {
    return (
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink"
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
    );
  }

  const desktopContent = (
    <>
      {renderBrand(false)}
      {renderNav(false)}

      <div className="mt-auto flex flex-col gap-2 pt-4">
        {!showBillboards && <ExplorerWidget visitedCount={visitedCount} collapsed={collapsed} />}
        {!showBillboards && <PointsWidget collapsed={collapsed} />}
        {renderFooter(false)}
      </div>
    </>
  );

  const mobileContent = (
    <>
      {renderBrand(true)}
      {renderNav(true)}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        {!showBillboards && <ExplorerWidget visitedCount={visitedCount} />}
        {!showBillboards && <PointsWidget />}
        {renderFooter(true)}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop rail — the collapse toggle is a normal in-flow button
          inside the panel now (see renderCollapseToggle), not floating
          outside it on the edge. It used to sit absolutely positioned at
          -right-3, half outside the <aside>'s rounded bounds, to look like
          a detached edge control — but that also meant it was a separate
          floating element straddling the gap between this panel and
          whatever sits next to it, which read as a visual seam/gap rather
          than one clean curved shape. Being fully inside removes that.
          Every piece of content stays mounted across collapse/expand and
          animates via the same duration/easing as the rail itself —
          swapping different components in and out mid-animation is what
          caused a jump/glitch this replaces. Padding stays constant too
          (only width changes) so nothing inside reflows vertically. */}
      {!publicMode && <div className={`relative hidden h-full shrink-0 lg:block ${SIDEBAR_TRANSITION} ${collapsed ? "w-[96px]" : "w-64"}`}>
        <aside className="panel-elevated flex h-full w-full flex-col gap-1 overflow-y-auto overflow-x-hidden rounded-3xl p-3.5">
          {desktopContent}
        </aside>
      </div>}

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        {/* 256px, matching the expanded desktop rail (w-64) — the same
            navigation should not be two different widths depending on how
            it opened. It was 288px, which on a 390px phone covered nearly
            three quarters of the map for a list of six short labels; the
            widest thing inside is a 200px widget row, so the extra was
            slack rather than content. The vw cap tightens with it so the
            proportion holds on a small phone instead of the fixed width
            taking over. */}
        <SheetContent side="left" className={`navigation-drawer flex w-64 max-w-[80vw] flex-col gap-1 p-4 ${publicMode ? "" : "lg:hidden"}`}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {mobileContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
