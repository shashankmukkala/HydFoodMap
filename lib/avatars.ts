// A small curated set of preset "face" avatars — emoji on a gradient
// background — used instead of Google's real profile photo. Stored in
// profiles.avatar_url as `avatar:<key>` (a plain string in an existing
// text column, no new column needed) rather than a real image URL, so
// components/Avatar.tsx can tell "pick a preset" apart from "a real
// photo URL" just by checking the prefix.
export type AvatarOption = { key: string; emoji: string; gradient: [string, string] };

export const AVATAR_PREFIX = "avatar:";

export const AVATAR_OPTIONS: AvatarOption[] = [
  { key: "fox", emoji: "🦊", gradient: ["#f2b431", "#ff8a3d"] },
  { key: "cat", emoji: "🐱", gradient: ["#a78bfa", "#7c3aed"] },
  { key: "panda", emoji: "🐼", gradient: ["#94a3b8", "#334155"] },
  { key: "koala", emoji: "🐨", gradient: ["#9ca3af", "#4b5563"] },
  { key: "lion", emoji: "🦁", gradient: ["#fbbf24", "#d97706"] },
  { key: "tiger", emoji: "🐯", gradient: ["#fb923c", "#c2410c"] },
  { key: "rabbit", emoji: "🐰", gradient: ["#f9a8d4", "#db2777"] },
  { key: "frog", emoji: "🐸", gradient: ["#4ade80", "#15803d"] },
  { key: "monkey", emoji: "🐵", gradient: ["#a16207", "#78350f"] },
  { key: "unicorn", emoji: "🦄", gradient: ["#c084fc", "#7c3aed"] },
  { key: "penguin", emoji: "🐧", gradient: ["#38bdf8", "#0369a1"] },
  { key: "owl", emoji: "🦉", gradient: ["#a8a29e", "#57534e"] },
  { key: "dragon", emoji: "🐲", gradient: ["#4ade80", "#166534"] },
  { key: "octopus", emoji: "🐙", gradient: ["#f472b6", "#be185d"] },
  { key: "bear", emoji: "🐻", gradient: ["#b45309", "#78350f"] },
  { key: "wolf", emoji: "🐺", gradient: ["#64748b", "#1e293b"] },
];

export function avatarKeyToValue(key: string): string {
  return `${AVATAR_PREFIX}${key}`;
}

export function getAvatarOption(value: string | null | undefined): AvatarOption | null {
  if (!value || !value.startsWith(AVATAR_PREFIX)) return null;
  const key = value.slice(AVATAR_PREFIX.length);
  return AVATAR_OPTIONS.find((o) => o.key === key) ?? null;
}
