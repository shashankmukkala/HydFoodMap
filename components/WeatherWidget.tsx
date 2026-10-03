"use client";

import { useEffect, useState } from "react";
import { HYDERABAD_CENTER } from "@/lib/mapStyle";

type WeatherState = {
  tempC: number;
  code: number;
} | null;

// WMO weather codes -> label/emoji. https://open-meteo.com/en/docs
const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear", icon: "☀️" },
  1: { label: "Mostly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Foggy", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌧️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Rain showers", icon: "🌦️" },
  82: { label: "Heavy showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
};

function describe(code: number) {
  return WEATHER_CODES[code] ?? { label: "—", icon: "🌡️" };
}

type WeatherWidgetProps = {
  compact?: boolean;
  /** Tiny horizontal chip for tight spaces, e.g. the top bar. */
  pill?: boolean;
};

export default function WeatherWidget({ compact = false, pill = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherState>(null);

  useEffect(() => {
    const [lng, lat] = HYDERABAD_CENTER;
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "temperature_2m,weather_code");
    url.searchParams.set("timezone", "auto");

    fetch(url.toString())
      .then((res) => res.json())
      .then((data) => {
        const current = data?.current;
        if (current) {
          setWeather({ tempC: Math.round(current.temperature_2m), code: current.weather_code });
        }
      })
      .catch(() => {});
  }, []);

  if (!weather) return null;

  const { label, icon } = describe(weather.code);

  if (pill) {
    return (
      <div
        title={label}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink/5 px-3 py-2 text-sm font-medium whitespace-nowrap text-ink"
      >
        <span className="text-[15px] leading-none">{icon}</span>
        <span className="tabular-nums">{weather.tempC}°C</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-paper px-2 py-3 text-center ring-1 ring-line">
        <span className="text-lg leading-none">{icon}</span>
        <div className="text-[15px] font-semibold tabular-nums text-ink">
          {weather.tempC}°C
        </div>
        <div className="text-[10px] leading-tight text-ink-muted">{label}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-paper px-3 py-2.5 ring-1 ring-line">
      <span className="text-lg leading-none">{icon}</span>
      <div className="leading-tight">
        <div className="text-sm font-semibold tabular-nums text-ink">
          {weather.tempC}°C
        </div>
        <div className="text-[11px] text-ink-muted">{label}</div>
      </div>
    </div>
  );
}
