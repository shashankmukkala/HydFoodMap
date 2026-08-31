"use client";

import { useEffect, useState } from "react";
import { HYDERABAD_CENTER } from "@/lib/mapStyle";

type AqiState = { aqi: number } | null;

function describeAqi(aqi: number) {
  if (aqi <= 50) return { label: "Good", color: "#22c55e" };
  if (aqi <= 100) return { label: "Moderate", color: "#eab308" };
  if (aqi <= 150) return { label: "Unhealthy (SG)", color: "#f97316" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#ef4444" };
  return { label: "Very unhealthy", color: "#a21caf" };
}

type AirQualityWidgetProps = {
  /** Tiny horizontal chip for tight spaces, e.g. the top bar. */
  pill?: boolean;
};

export default function AirQualityWidget({ pill = false }: AirQualityWidgetProps) {
  const [aqi, setAqi] = useState<AqiState>(null);

  useEffect(() => {
    const [lng, lat] = HYDERABAD_CENTER;
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "us_aqi");

    fetch(url.toString())
      .then((res) => res.json())
      .then((data) => {
        const value = data?.current?.us_aqi;
        if (typeof value === "number") setAqi({ aqi: Math.round(value) });
      })
      .catch(() => {});
  }, []);

  if (!aqi) return null;

  const { label, color } = describeAqi(aqi.aqi);

  if (pill) {
    return (
      <div
        title={`Air quality: ${label}`}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium whitespace-nowrap text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="tabular-nums">{aqi.aqi}</span>
        <span className="hidden text-neutral-400 md:inline">AQI</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-neutral-50 px-2 py-3 text-center ring-1 ring-neutral-100 dark:bg-neutral-800/60 dark:ring-neutral-800">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <div className="text-[15px] font-semibold tabular-nums text-neutral-800 dark:text-neutral-100">{aqi.aqi}</div>
      <div className="text-[10px] leading-tight text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
}
