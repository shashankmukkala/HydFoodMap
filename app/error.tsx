"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The route-level error boundary: the fallback for any uncaught render
 * error below the root layout.
 *
 * `retry` — not `reset`, which is what this prop was called in earlier
 * Next versions — re-renders the boundary's children. That is worth
 * offering because the most likely cause here is transient: Supabase
 * unreachable, a geolocation permission prompt denied mid-render, a tile
 * request that failed. A reload would discard the whole client app; retry
 * re-runs just this segment.
 *
 * `error.digest` is the only thing that ties what the user saw to the
 * server log entry. In production Next deliberately replaces server-side
 * error messages with a generic string, so the digest is the handle — it
 * is printed on the page on purpose, because asking a user "what did it
 * say?" is how support actually works.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Replace with a real error reporter (Sentry et al) when one is wired
    // up — until then this at least reaches the browser console and, for
    // server-side throws, the platform log.
    console.error("Unhandled error boundary:", error);
  }, [error]);

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[var(--paper)] px-5 py-16">
      <div className="w-full max-w-lg">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--ink-soft)] uppercase">
          Something broke
        </p>
        <h1 className="mt-3 text-[2rem] leading-[1.1] text-[var(--ink)] sm:text-[2.5rem]">
          That didn’t load.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-muted)]">
          This one is on us, not on you. Trying again usually works — the most common cause is a
          connection that dropped mid-request.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-6">
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
          <Link href="/map" className="painted-link py-2.5 text-[13px] font-medium">
            Open the map
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
