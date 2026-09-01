import type { Cafe } from "@/lib/supabase";
import { CATEGORY_OPTIONS, CATEGORY_SHORT_LABELS, type Category } from "@/lib/categories";
import { TAG_ICONS, TAG_OPTIONS, type Tag } from "@/lib/tags";

// Handles compound, typo-tolerant queries like "work friendly in jublie
// hills" — a vibe/tag AND a (misspelled) area in the same search. The
// earlier version checked the whole query string against each tag/
// category/location in turn and stopped at the first hit, so a query
// combining two criteria only ever matched one of them (or neither, if
// the combined string didn't substring-match anything).  This instead:
// tokenizes the query into words, drops filler words ("in", "near", ...),
// fuzzy-matches (typo-tolerant) each word against tag/category/location
// vocabulary, and combines every criterion it finds (AND, not first-wins)
// into one filter.

const STOPWORDS = new Set(["in", "at", "near", "around", "the", "a", "an", "of", "for", "with"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Exact match, PREFIX match (handles plurals/short forms — "cafe" vs
// "cafes"), or a small edit-distance allowance scaled to word length
// (typo tolerance without being so loose that unrelated short words
// collide). "jublie" -> "jubilee" is a real example the edit-distance
// tolerance needs to catch: a dropped letter plus a transposition is
// edit-distance 2 even though it reads as an obvious one-word typo, so
// the threshold is keyed off the longer of the two words (not the
// shorter) — a short query word shouldn't get less tolerance just because
// the dictionary word it's matching against is long.
//
// The length cutoff for allowing that distance-2 tolerance is 6, not 5:
// "buffet" and "budget" are both real vocabulary (a category and a tag),
// both 6 letters, and are genuinely edit-distance 2 apart (two
// substitutions) — with the cutoff at 5 they satisfied "6 > 5" and
// silently matched each other, so searching "best buffet" quietly added
// a "💰 Budget" tag filter nobody asked for and zeroed out the results.
// Moving the cutoff to 6 excludes that pair (needs distance ≤1 at that
// length) while still covering jublie/jubilee (7 letters, > 6).
//
// Prefix-only, not "contains anywhere": an earlier version used
// `a.includes(b) || b.includes(a)`, which matched "pet" inside
// "gandiPET" and silently added "📍 Gandipet" to a "pet friendly" search
// that never mentioned Gandipet at all — a real false positive from that
// codebase, not a hypothetical one. Prefix containment still catches the
// legitimate plural/truncation cases ("cafe" -> "cafes") without matching
// a short word buried inside an unrelated longer one.
function wordsMatch(a: string, b: string): boolean {
  if (a === b || a.startsWith(b) || b.startsWith(a)) return true;
  if (a.length < 4 || b.length < 4) return false;
  const maxDist = Math.max(a.length, b.length) <= 6 ? 1 : 2;
  return levenshtein(a, b) <= maxDist;
}

function overlapScore(candidateWords: string[], queryTokens: string[]): number {
  return candidateWords.filter((cw) => queryTokens.some((qt) => wordsMatch(cw, qt))).length;
}

// "best/top" narrows by the internal-only source rating (cafes.rating,
// carried over from new_data.json — NOT a verified review average, which
// doesn't exist yet for most cafes). This is the one place that field is
// allowed to affect anything: it only narrows which cafes end up in the
// result list, and the number itself is never put in the label or shown
// anywhere — the "Reviews here are verified" promise means no rating
// value from this field may ever reach the UI, but silently using it to
// rank/filter search results doesn't display it, so it doesn't violate
// that.
const RATING_WORDS = new Set(["best", "top", "good", "great", "finest", "highly", "rated"]);
const TOP_RATED_THRESHOLD = 4;

export type SearchGroupMatch = { label: string; cafes: Cafe[]; category?: Category } | null;

export function matchSearchGroup(query: string, cafes: Cafe[]): SearchGroupMatch {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;

  const tagMatch: Tag | undefined = TAG_OPTIONS.find((t) => {
    const words = tokenize(t);
    return overlapScore(words, tokens) === words.length;
  });

  const categoryMatch: Category | undefined = CATEGORY_OPTIONS.find((c) => {
    const shortWords = tokenize(CATEGORY_SHORT_LABELS[c]);
    if (overlapScore(shortWords, tokens) === shortWords.length) return true;
    const fullWords = tokenize(c);
    return overlapScore(fullWords, tokens) >= Math.min(2, fullWords.length);
  });

  const wantsTopRated = tokens.some((t) => RATING_WORDS.has(t));

  const locations = [...new Set(cafes.map((c) => c.location).filter((l): l is string => !!l))];
  let areaMatch: string | undefined;
  let bestAreaScore = 0;
  for (const loc of locations) {
    const words = tokenize(loc);
    const score = overlapScore(words, tokens);
    const threshold = Math.min(2, words.length);
    if (score >= threshold && score > bestAreaScore) {
      areaMatch = loc;
      bestAreaScore = score;
    }
  }

  if (!tagMatch && !categoryMatch && !areaMatch && !wantsTopRated) return null;

  // Category is deliberately NOT filtered here, only reported — a cafe
  // has exactly one category, so if the text names a different one than
  // whatever's currently selected in the manual Type chip, filtering
  // *within* that stale selection can only ever produce zero results
  // (e.g. Type="Bar" manually active, then typing "best cafes" here would
  // filter the already-Bar-only list down to Cafe, which is empty, even
  // though real cafes obviously exist). The caller reconciles this by
  // replacing the manual Type selection with the category found here.
  let result = cafes;
  const labelParts: string[] = [];
  if (tagMatch) {
    result = result.filter((c) => c.tags.includes(tagMatch));
    labelParts.push(`${TAG_ICONS[tagMatch]} ${tagMatch}`);
  }
  if (areaMatch) {
    result = result.filter((c) => c.location === areaMatch);
    labelParts.push(`📍 ${areaMatch}`);
  }
  if (wantsTopRated) {
    result = result.filter((c) => (c.rating ?? 0) >= TOP_RATED_THRESHOLD);
    // No labelParts entry — no "Top Rated"/threshold wording at all, per
    // the never-shown rule above. When that leaves labelParts empty (no
    // tag/category/area was also named — e.g. "best places in
    // hyderabad"), the panel still needs *some* heading to be visible
    // and browsable, so it falls back to the query exactly as typed
    // rather than a synthesized description of what matched.
  }

  // The raw-text fallback only applies when there's truly nothing else
  // to show — including category, which isn't in labelParts (the caller
  // renders it separately) but would otherwise end up redundantly next
  // to the raw query too, e.g. "☕ Cafe · best cafes" for a plain
  // "best cafes" search.
  const label =
    labelParts.length > 0 ? labelParts.join(" · ") : wantsTopRated && !categoryMatch ? query.trim() : "";
  return { label, cafes: result, category: categoryMatch };
}
