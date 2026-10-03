"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The map's own boundary, so a map failure does not fall through to the
 * generic "that didn't load" page.
 *
 * It earns its own file because the map has a failure mode no other route
 * has and that the generic copy cannot help with: MapLibre throws outright
 * when WebGL is unavailable — an old phone, a locked-down browser, a
 * desktop with hardware acceleration switched off — and no amount of
 * retrying fixes that. Naming it is the difference between a user thinking
 * the site is broken and knowing their browser is the problem.
 */
export default function MapError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // MapLibre's own message is the only signal for this, and it differs
  // between browsers — match loosely rather than on an exact string.
  const looksLikeWebgl = /webgl|context|gpu/i.test(error.message);

  useEffect(() => {
    console.error("Map error boundary:", error);
  }, [error]);

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[var(--paper)] px-5 py-16">
      <div className="w-full max-w-lg">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--ink-soft)] uppercase">
          Map unavailable
        </p>
        <h1 className="mt-3 text-[2rem] leading-[1.1] text-[var(--ink)] sm:text-[2.5rem]">
          {looksLikeWebgl ? "This browser can’t draw the map." : "The map didn’t load."}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-muted)]">
          {looksLikeWebgl
            ? "The map needs WebGL, which this browser has turned off or doesn’t support. Switching on hardware acceleration, or opening the site in a recent Chrome, Safari, Firefox or Edge, will fix it."
            : "Usually a dropped connection while the map tiles were loading. Trying again is worth a shot."}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          {!looksLikeWebgl && (
            <button
              type="button"
              onClick={() => retry()}
              className="painted-link painted-link--primary painted-link--start py-2.5 text-[14px] font-semibold"
            >
              Try again
              <span aria-hidden="true" className="arrow">
                →
              </span>
              <span aria-hidden="true" className="rule" />
            </button>
          )}
          <Link href="/" className="painted-link py-2.5 text-[13px] font-medium">
            Back to the cover
            <span aria-hidden="true" className="rule" />
          </Link>
        </div>

        {error.digest && (
          <p className="mt-10 font-mono text-[11px] text-[var(--ink-soft)]">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
