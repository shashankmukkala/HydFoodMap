"use client";

import { getAvatarOption } from "@/lib/avatars";

type Props = {
  avatarUrl: string | null;
  label: string;
  className?: string;
};

// One place that decides *what* to render for someone's avatar — a
// preset emoji/gradient (avatar:<key>, see lib/avatars.ts), a real photo
// URL, or an initial-letter fallback — so every avatar shown across the
// app (top bar, profile, leaderboard, admin users) agrees on the same
// three cases instead of each re-implementing this conditional. Renders
// no layout of its own beyond the className passed in — sizing/rounding/
// centering stays with the caller, since that varies per spot.
export default function Avatar({ avatarUrl, label, className }: Props) {
  const preset = getAvatarOption(avatarUrl);

  if (preset) {
    return (
      <span
        className={className}
        style={{ background: `linear-gradient(145deg, ${preset.gradient[0]}, ${preset.gradient[1]})` }}
      >
        <span aria-hidden="true">{preset.emoji}</span>
      </span>
    );
  }

  if (avatarUrl) {
    return (
      <span className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return <span className={className}>{(label || "?").slice(0, 1).toUpperCase()}</span>;
}
