"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Billboard } from "@/lib/supabase";

type AdRailProps = {
  billboards: Billboard[];
  onSelect: (billboard: Billboard) => void;
};

const SLOT_COUNT = 5;

export default function AdRail({ billboards, onSelect }: AdRailProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const activeAds = billboards.filter((billboard) => billboard.ad_type === "rail").sort((a, b) => (a.slot_number ?? 99) - (b.slot_number ?? 99));

  return (
    <div className={`ad-rail ${collapsed ? "ad-rail-collapsed" : ""}`} aria-label="Sponsored placements">
      {collapsed ? (
        <button type="button" className="ad-rail-reopen" onClick={() => setCollapsed(false)} aria-label="Show sponsored placements">
          <span aria-hidden="true">AD</span>
          <span>Sponsored</span>
          <span aria-hidden="true">⌃</span>
        </button>
      ) : (
        <>
          <div className="ad-rail-header">
            <div>
              <span className="ad-rail-kicker">SPONSORED</span>
              <strong>Discover local brands</strong>
            </div>
            <button type="button" onClick={() => setCollapsed(true)} className="ad-rail-collapse" aria-label="Collapse sponsored placements">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 8l5 5 5-5" />
              </svg>
            </button>
          </div>
          <div className="ad-rail-slots">
            {Array.from({ length: SLOT_COUNT }, (_, index) => {
              const ad = activeAds[index];
              return ad ? (
                <button type="button" key={ad.id} className="ad-rail-slot ad-rail-slot-filled" onClick={() => onSelect(ad)}>
                  <span className="ad-rail-slot-image">
                    {ad.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.image_url} alt="" />
                    ) : (
                      <span>{ad.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="ad-rail-slot-copy">
                    <strong>{ad.name}</strong>
                    <small>View placement</small>
                  </span>
                  <span className="ad-rail-arrow" aria-hidden="true">↗</span>
                </button>
              ) : (
                <button type="button" key={`empty-${index}`} className="ad-rail-slot ad-rail-slot-empty" onClick={() => router.push("/advertise")}>
                  <span className="ad-rail-empty-plus" aria-hidden="true">+</span>
                  <span>Advertise here</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="ad-rail-footer" onClick={() => router.push("/advertise")}>Reach Hyderabad&apos;s cafe explorers <span>·</span> <strong>Advertise</strong></button>
        </>
      )}
    </div>
  );
}
