"use client";

import { getAvatarOption, pickAvatarForSeed } from "@/lib/avatars";

type Props = {
  avatarUrl: string | null;
  label: string;
  className?: string;
};

// Every avatar shown anywhere in the app (top bar, profile, leaderboard,
// admin users) is one of the 16 preset emoji/gradient faces (avatar:<key>,
// see lib/avatars.ts) — never a real photo, and never an alphabet
// initial. New signups get a random preset (0034) and every existing
// account was backfilled the same way (0035), so `avatarUrl` should
// always already be a preset value by the time this renders; the
// deterministic fallback below only guards the case where it somehow
// isn't (e.g. a row created between those migrations and this code
// shipping) — still a face, seeded off the label so it's stable rather
// than reshuffling on every render.
export default function Avatar({ avatarUrl, label, className }: Props) {
  const option = getAvatarOption(avatarUrl) ?? pickAvatarForSeed(label || "?");

  return (
    <span
      className={className}
      style={{ background: `linear-gradient(145deg, ${option.gradient[0]}, ${option.gradient[1]})` }}
    >
      <span aria-hidden="true">{option.emoji}</span>
    </span>
  );
}
