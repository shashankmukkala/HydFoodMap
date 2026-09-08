"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Cafe } from "@/lib/supabase";
import { foldAccents, matchSearchGroup, type SearchGroupMatch } from "@/lib/searchMatch";

type PlaceResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export type { SearchGroupMatch };

type SearchBoxProps = {
  map: MapLibreMap | null;
  cafes: Cafe[];
  onSelectCafe: (cafe: Cafe) => void;
  /** Fired (debounced) whenever the typed text matches a vibe/tag, a cafe
   *  type, or an area — as opposed to a specific cafe by name — so the
   *  caller can show every match at once and fit the map to them. Fired
   *  with null when there's no such match (including an empty query). */
  onGroupMatch: (match: SearchGroupMatch) => void;
  /** Bump this (any value change) to clear the query text and dropdown
   *  from outside — e.g. when the parent closes the results panel via its
   *  own X button, so a stale query doesn't silently re-match and reopen
   *  the panel a moment later. */
  clearSignal?: number;
  /** Bump this (any value change) to close just the geocoded-place
   *  dropdown under the search box, leaving the typed query and the
   *  group-match results panel alone. Fired whenever a cafe gets picked
   *  from *outside* this component — e.g. a row in SearchResultsPanel —
   *  since only this component's own selectCafe/selectPlace clear the
   *  dropdown otherwise; without this, picking a cafe from the results
   *  list left the unrelated address suggestion sitting open underneath
   *  the search bar. */
  dismissDropdownSignal?: number;
};

export default function SearchBox({ map, cafes, onSelectCafe, onGroupMatch, clearSignal, dismissDropdownSignal }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  // True while the text in the box was put there by choosing a specific
  // cafe rather than typed — see selectCafe and the group-match effect.
  const [queryFromPick, setQueryFromPick] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset in response to an incoming `clearSignal` change, adjusted
  // during render (React's recommended pattern for "state driven by a
  // prop" — see https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  // rather than in an effect, which would set state after the fact and
  // cause an extra cascading render for something this synchronous.
  const [lastClearSignal, setLastClearSignal] = useState(clearSignal);
  if (clearSignal !== undefined && clearSignal !== lastClearSignal) {
    setLastClearSignal(clearSignal);
    setQuery("");
    setQueryFromPick(false);
    setPlaces([]);
    setStatus("idle");
  }

  const [lastDismissSignal, setLastDismissSignal] = useState(dismissDropdownSignal);
  if (dismissDropdownSignal !== undefined && dismissDropdownSignal !== lastDismissSignal) {
    setLastDismissSignal(dismissDropdownSignal);
    setPlaces([]);
    setStatus("idle");
  }

  // Accent-folded on both sides, so a name typed on an English keyboard
  // finds the cafe as spelled. "Conçu".toLowerCase().includes("concu") is
  // false — ç is not c — which meant the one cafe most people would search
  // for by name could not be found by name at all.
  const foldedQuery = foldAccents(query.trim()).toLowerCase();
  const matchingCafes = foldedQuery.length >= 2
    ? cafes
        .filter(
          (c) =>
            foldAccents(c.name).toLowerCase().includes(foldedQuery) ||
            (c.category ? foldAccents(c.category).toLowerCase().includes(foldedQuery) : false)
        )
        .slice(0, 5)
    : [];

  // A vibe/type/area query has no single "right" cafe to jump to — it
  // matches many at once — so it's handled separately from the name/place
  // dropdown below: debounced, and reported up via onGroupMatch instead of
  // rendered as dropdown rows, so just typing "quiet" or "gachibowli" (or
  // a combined, typo-tolerant "work friendly in jublie hills" — see
  // lib/searchMatch.ts) is enough to see results without picking anything.
  //
  // `cafes` here is already the Type/tags/rating-filtered list (see
  // MapExperience — it hands this component `visibleCafes`, not the full
  // cafe set), so matching against it makes search compose with the
  // manual filters instead of overriding them. That's also why `cafes` is
  // a real dependency now, not omitted: when a manual filter changes,
  // this needs to re-run against the new narrower set with the same query
  // text, or the results panel would keep showing stale matches computed
  // against the old filter state.
  useEffect(() => {
    if (groupDebounceRef.current) clearTimeout(groupDebounceRef.current);
    const q = query.trim();

    // Written by picking a cafe, not typed — treat it as "go to that one
    // place" and leave the filters and the camera alone. Typing clears the
    // flag (see search()), so editing after a pick resumes group matching.
    if (queryFromPick) return;

    if (q.length < 2) {
      onGroupMatch(null);
      return;
    }

    groupDebounceRef.current = setTimeout(() => {
      onGroupMatch(matchSearchGroup(q, cafes));
    }, 350);
    // onGroupMatch intentionally omitted — it's a fresh function identity
    // every render (not memoized in the parent), so including it would
    // defeat the debounce by re-running this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, queryFromPick, cafes]);

  // Logged separately from the group-match effect above (longer debounce
  // — 900ms vs 350ms) so a search only gets recorded once someone
  // actually pauses on it, not once per intermediate state while they're
  // still typing toward a longer word. Fire-and-forget: analytics should
  // never be able to affect the search UI itself, so no loading/error
  // state here, and a failure is silently dropped.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      const nameMatches = cafes.filter(
        (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.category?.toLowerCase().includes(q.toLowerCase())
      ).length;
      const group = matchSearchGroup(q, cafes);
      const resultCount = group ? group.cafes.length : nameMatches;
      fetch("/api/search-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, resultCount }),
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [query, cafes]);

  function search(value: string) {
    // Typing always resumes normal group searching, whatever put the
    // previous text there.
    setQueryFromPick(false);
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setPlaces([]);
      setStatus("idle");
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        if (!res.ok) throw new Error("geocode failed");
        const data = await res.json();
        setPlaces(Array.isArray(data) ? data : []);
        setStatus("idle");
      } catch {
        setPlaces([]);
        setStatus("error");
      }
    }, 350);
  }

  function selectPlace(result: PlaceResult) {
    if (!map) return;
    map.flyTo({
      center: [parseFloat(result.lon), parseFloat(result.lat)],
      zoom: 16.5,
      pitch: 55,
      essential: true,
    });
    setPlaces([]);
    // Left as a normal query on purpose: an address is an area, so letting
    // it group-match ("Jubilee Hills") and narrow the list is useful, which
    // a specific cafe pick is not. Reset explicitly so the flag can't carry
    // over from a cafe picked just before this.
    setQueryFromPick(false);
    setQuery(result.display_name);
  }

  function selectCafe(cafe: Cafe) {
    // Marks the text below as written by a pick rather than typed. Picking
    // one cafe writes its name into the box, which then looks exactly like
    // a fresh group query to the debounced effect above — and most cafe
    // names contain a word the group matcher knows. "RITHM Cafe" matched
    // the Cafe *category*, so tapping it flew the map to that cafe and
    // then, 350ms later, refitted across all 40 cafes and silently
    // flipped the Type chip. 58 of 85 names collided this way.
    setQueryFromPick(true);
    onSelectCafe(cafe);
    setPlaces([]);
    setQuery(cafe.name);
  }

  // Computed directly on every render (not the debounced onGroupMatch
  // state up in MapExperience) so both handleKeyDown and the dropdown
  // visibility below always reflect the *current* query — including the
  // instant it's typed, before the 350ms debounce fires — rather than
  // lagging a beat behind. matchSearchGroup is a cheap pure function, so
  // recomputing it on every keystroke's render is fine.
  const trimmedQuery = query.trim();
  const groupMatch = trimmedQuery.length >= 2 ? matchSearchGroup(trimmedQuery, cafes) : null;

  // Enter previously did nothing — the dropdown rows only responded to a
  // mouse click, so someone who typed an area and hit Enter (the natural
  // thing to do after seeing a result appear) saw no response at all.
  // Acts on the top row exactly as clicking it would: a matching cafe by
  // name first (there's a specific place to jump to), otherwise the top
  // geocoded place result.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (matchingCafes[0]) {
      selectCafe(matchingCafes[0]);
      return;
    }
    // A vibe/type/area query (e.g. "Sainik" matching "📍 Sainikpuri") is
    // already showing the right results panel below — Enter shouldn't
    // fall through to the geocoded-address dropdown and jump the map to
    // some unrelated street with a similar name (e.g. "Sainik Enclave
    // Road, Chandrapuri"), overwriting the query with that address and
    // silently swapping out the results the user was just looking at.
    if (groupMatch) return;
    if (places[0]) {
      selectPlace(places[0]);
    }
  }

  // Same reasoning as Enter above: once the query already resolves to a
  // vibe/type/area match with its own results panel showing below, the
  // geocoded-address suggestions are redundant and confusing sitting
  // open over the map at the same time (they were also the thing Enter
  // could accidentally jump to) — so hide just that part of the
  // dropdown. Exact cafe-name hits (matchingCafes) still show regardless,
  // since those remain directly useful even alongside a group match.
  const showPlaces = places.length > 0 && !groupMatch;
  const showDropdown = trimmedQuery.length >= 2 && (matchingCafes.length > 0 || showPlaces || (status !== "idle" && !groupMatch));

  return (
    <div className="relative w-full">
      <svg
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-400"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="9" cy="9" r="6" />
        <path d="M17 17l-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search cafes, areas, vibes..."
        className="w-full rounded-full border border-black/5 bg-neutral-100 py-2.5 pr-4 pl-9 text-sm text-neutral-700 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-white/5 dark:bg-neutral-800 dark:text-neutral-200 dark:focus:bg-neutral-800"
      />
      {showDropdown && (
        <div className="panel-elevated absolute top-full mt-2 max-h-80 w-full overflow-y-auto rounded-2xl">
          {matchingCafes.map((cafe) => (
            <button
              key={cafe.id}
              onClick={() => selectCafe(cafe)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-amber-50 dark:text-neutral-200 dark:hover:bg-amber-950/50"
            >
              <span>☕</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{cafe.name}</span>
                {cafe.category && <span className="text-neutral-400"> · {cafe.category}</span>}
              </span>
            </button>
          ))}

          {status === "loading" && !groupMatch && <div className="px-4 py-2 text-sm text-neutral-400">Searching…</div>}
          {status === "error" && !groupMatch && (
            <div className="px-4 py-2 text-sm text-red-500">Couldn&apos;t reach the map search service.</div>
          )}
          {status === "idle" && !showPlaces && matchingCafes.length === 0 && !groupMatch && (
            <div className="px-4 py-2 text-sm text-neutral-400">No results.</div>
          )}
          {showPlaces && places.map((result) => (
            <button
              key={`${result.lat},${result.lon}`}
              onClick={() => selectPlace(result)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-amber-50 dark:text-neutral-200 dark:hover:bg-amber-950/50"
            >
              <span>📍</span>
              <span className="truncate">{result.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
